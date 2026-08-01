import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ChargeDetailDto,
  ChargeDto,
  ChargeInput,
  ChargeModule,
  ChargeScheduleEntryDto,
  ChargeScheduleUpdateInput,
  ChargeTypeDto,
  ChargeTypeInput,
  ListQuery,
  ChargeListQuery,
  Paginated,
  TaxCategoryDto,
  TaxCategoryInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class ChargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Tax categories (name + percent) ──────────────────────────
  async listTax(branchId: string, query: ListQuery): Promise<Paginated<TaxCategoryDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.TaxCategoryWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.taxCategory.findMany({ where, skip, take, orderBy }),
      this.prisma.taxCategory.count({ where }),
    ]);
    return paginate(rows.map(toTaxDto), total, query);
  }

  async createTax(user: RequestUser, branchId: string, input: TaxCategoryInput): Promise<TaxCategoryDto> {
    const t = await this.prisma.taxCategory.create({
      data: { branchId, name: input.name, percent: input.percent },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'tax-category', entityId: t.id });
    return toTaxDto(t);
  }

  async updateTax(
    user: RequestUser,
    branchId: string,
    id: string,
    input: TaxCategoryInput,
  ): Promise<TaxCategoryDto> {
    await this.ensure(this.prisma.taxCategory, branchId, id, 'Tax category not found');
    const t = await this.prisma.taxCategory.update({
      where: { id },
      data: { name: input.name, percent: input.percent },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'tax-category', entityId: id });
    return toTaxDto(t);
  }

  async removeTax(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.ensure(this.prisma.taxCategory, branchId, id, 'Tax category not found');
    await this.prisma.taxCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'tax-category', entityId: id });
  }

  // ── Charge types (name + module-visibility matrix) ───────────
  async listTypes(branchId: string, query: ListQuery): Promise<Paginated<ChargeTypeDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.ChargeTypeWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.chargeType.findMany({ where, skip, take, orderBy }),
      this.prisma.chargeType.count({ where }),
    ]);
    return paginate(rows.map(toChargeTypeDto), total, query);
  }

  async createType(user: RequestUser, branchId: string, input: ChargeTypeInput): Promise<ChargeTypeDto> {
    const t = await this.prisma.chargeType.create({
      data: { branchId, name: input.name, modules: input.modules },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'charge-type', entityId: t.id });
    return toChargeTypeDto(t);
  }

  async updateType(
    user: RequestUser,
    branchId: string,
    id: string,
    input: ChargeTypeInput,
  ): Promise<ChargeTypeDto> {
    await this.ensure(this.prisma.chargeType, branchId, id, 'Charge type not found');
    const t = await this.prisma.chargeType.update({
      where: { id },
      data: { name: input.name, modules: input.modules },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'charge-type', entityId: id });
    return toChargeTypeDto(t);
  }

  async removeType(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.ensure(this.prisma.chargeType, branchId, id, 'Charge type not found');
    await this.prisma.chargeType.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'charge-type', entityId: id });
  }

  // ── Charges ──────────────────────────────────────────────────
  async list(branchId: string, query: ChargeListQuery): Promise<Paginated<ChargeDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.ChargeWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      // The Charge Type visibility matrix (Setup ▸ Hospital Charges ▸ Charge
      // Type). A charge is offerable in a module only if its type is ticked
      // for that module. A charge with no type at all is not scoped by the
      // matrix, so it stays out of module-scoped pickers rather than leaking
      // into all of them.
      ...(query.module ? { type: { modules: { has: query.module } } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.charge.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { category: true, type: true, unit: true, taxCategory: true },
      }),
      this.prisma.charge.count({ where }),
    ]);
    return paginate(rows.map(toChargeDto), total, query);
  }

  async detail(branchId: string, id: string): Promise<ChargeDetailDto> {
    const charge = await this.prisma.charge.findFirst({
      where: { id, branchId, deletedAt: null },
      include: { category: true, type: true, unit: true, taxCategory: true },
    });
    if (!charge) throw new NotFoundException('Charge not found');

    const [tpas, schedules] = await this.prisma.$transaction([
      this.prisma.tpa.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.chargeSchedule.findMany({ where: { branchId, chargeId: id } }),
    ]);
    const amountByTpa = new Map(schedules.map((s) => [s.tpaId, Number(s.amount)]));
    const schedule: ChargeScheduleEntryDto[] = tpas.map((t) => ({
      tpaId: t.id,
      tpaName: t.name,
      amount: amountByTpa.get(t.id) ?? null,
    }));

    return { ...toChargeDto(charge), taxCategoryName: charge.taxCategory?.name ?? null, schedule };
  }

  async getSchedule(branchId: string, chargeId: string): Promise<ChargeScheduleEntryDto[]> {
    await this.ensure(this.prisma.charge, branchId, chargeId, 'Charge not found');
    const [tpas, schedules] = await this.prisma.$transaction([
      this.prisma.tpa.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.chargeSchedule.findMany({ where: { branchId, chargeId } }),
    ]);
    const amountByTpa = new Map(schedules.map((s) => [s.tpaId, Number(s.amount)]));
    return tpas.map((t) => ({ tpaId: t.id, tpaName: t.name, amount: amountByTpa.get(t.id) ?? null }));
  }

  async updateSchedule(
    user: RequestUser,
    branchId: string,
    chargeId: string,
    input: ChargeScheduleUpdateInput,
  ): Promise<ChargeScheduleEntryDto[]> {
    await this.ensure(this.prisma.charge, branchId, chargeId, 'Charge not found');
    await this.prisma.$transaction(
      input.entries.map((e) =>
        this.prisma.chargeSchedule.upsert({
          where: { chargeId_tpaId: { chargeId, tpaId: e.tpaId } },
          create: { branchId, chargeId, tpaId: e.tpaId, amount: e.amount },
          update: { amount: e.amount },
        }),
      ),
    );
    const keep = input.entries.map((e) => e.tpaId);
    await this.prisma.chargeSchedule.deleteMany({
      where: { branchId, chargeId, tpaId: keep.length ? { notIn: keep } : undefined },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'charge-schedule', entityId: chargeId });
    return this.getSchedule(branchId, chargeId);
  }

  async create(user: RequestUser, branchId: string, input: ChargeInput): Promise<ChargeDto> {
    const charge = await this.prisma.charge.create({
      data: {
        branchId,
        name: input.name,
        categoryId: input.categoryId ?? null,
        typeId: input.typeId ?? null,
        unitId: input.unitId ?? null,
        taxCategoryId: input.taxCategoryId ?? null,
        standardCharge: input.standardCharge,
      },
      include: { category: true, type: true, unit: true, taxCategory: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'charge', entityId: charge.id });
    return toChargeDto(charge);
  }

  async update(user: RequestUser, branchId: string, id: string, input: ChargeInput): Promise<ChargeDto> {
    const existing = await this.prisma.charge.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Charge not found');
    const charge = await this.prisma.charge.update({
      where: { id },
      data: {
        name: input.name,
        categoryId: input.categoryId ?? null,
        typeId: input.typeId ?? null,
        unitId: input.unitId ?? null,
        taxCategoryId: input.taxCategoryId ?? null,
        standardCharge: input.standardCharge,
      },
      include: { category: true, type: true, unit: true, taxCategory: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'charge', entityId: id });
    return toChargeDto(charge);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.charge.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Charge not found');
    await this.prisma.charge.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'charge', entityId: id });
  }

  private async ensure(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: any,
    branchId: string,
    id: string,
    message: string,
  ): Promise<void> {
    const found = await delegate.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!found) throw new NotFoundException(message);
  }
}

function toTaxDto(t: { id: string; name: string; percent: Prisma.Decimal; createdAt: Date }): TaxCategoryDto {
  return { id: t.id, name: t.name, percent: Number(t.percent), createdAt: t.createdAt.toISOString() };
}

function toChargeTypeDto(t: {
  id: string;
  name: string;
  modules: string[];
  createdAt: Date;
}): ChargeTypeDto {
  return { id: t.id, name: t.name, modules: t.modules as ChargeModule[], createdAt: t.createdAt.toISOString() };
}

function toChargeDto(c: {
  id: string;
  name: string;
  categoryId: string | null;
  category: { name: string } | null;
  typeId: string | null;
  type: { name: string } | null;
  unitId: string | null;
  unit: { name: string } | null;
  taxCategoryId: string | null;
  taxCategory: { percent: Prisma.Decimal } | null;
  standardCharge: Prisma.Decimal;
  createdAt: Date;
}): ChargeDto {
  return {
    id: c.id,
    name: c.name,
    categoryId: c.categoryId,
    categoryName: c.category?.name ?? null,
    typeId: c.typeId,
    typeName: c.type?.name ?? null,
    unitId: c.unitId,
    unitName: c.unit?.name ?? null,
    taxCategoryId: c.taxCategoryId,
    taxPercent: c.taxCategory ? Number(c.taxCategory.percent) : 0,
    standardCharge: Number(c.standardCharge),
    createdAt: c.createdAt.toISOString(),
  };
}
