import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ListQuery,
  Paginated,
  TpaChargeImportInput,
  TpaChargeImportResult,
  TpaChargeRowDto,
  TpaDto,
  TpaInput,
  TpaReportResult,
  TpaReportRow,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

export interface TpaReportFilters {
  from?: string;
  to?: string;
  doctorId?: string;
  tpaId?: string;
  caseId?: string;
  chargeCategoryId?: string;
  chargeId?: string;
}

@Injectable()
export class TpaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(branchId: string, query: ListQuery): Promise<Paginated<TpaDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.TpaWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tpa.findMany({ where, skip, take, orderBy }),
      this.prisma.tpa.count({ where }),
    ]);
    return paginate(rows.map(toDto), total, query);
  }

  async create(user: RequestUser, branchId: string, input: TpaInput): Promise<TpaDto> {
    const tpa = await this.prisma.tpa.create({
      data: { ...clean(input), branchId, createdById: user.id } as Prisma.TpaUncheckedCreateInput,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'tpa', entityId: tpa.id });
    return toDto(tpa);
  }

  async update(user: RequestUser, branchId: string, id: string, input: TpaInput): Promise<TpaDto> {
    const existing = await this.prisma.tpa.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('TPA not found');
    const tpa = await this.prisma.tpa.update({
      where: { id },
      data: clean(input) as Prisma.TpaUncheckedUpdateInput,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'tpa', entityId: id });
    return toDto(tpa);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.tpa.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('TPA not found');
    await this.prisma.tpa.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'tpa', entityId: id });
  }

  async detail(branchId: string, id: string): Promise<TpaDto> {
    const tpa = await this.prisma.tpa.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!tpa) throw new NotFoundException('TPA not found');
    return toDto(tpa);
  }

  private async assertTpa(branchId: string, tpaId: string) {
    const tpa = await this.prisma.tpa.findFirst({ where: { id: tpaId, branchId, deletedAt: null } });
    if (!tpa) throw new NotFoundException('TPA not found');
    return tpa;
  }

  /** All charges available in a module, joined with this TPA's negotiated amount. */
  async listCharges(branchId: string, tpaId: string, module: string | undefined): Promise<TpaChargeRowDto[]> {
    await this.assertTpa(branchId, tpaId);
    const charges = await this.prisma.charge.findMany({
      where: {
        branchId,
        deletedAt: null,
        ...(module ? { type: { modules: { has: module } } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: { category: true, type: true, schedules: { where: { tpaId } } },
    });
    return charges.map((c) => ({
      chargeId: c.id,
      chargeType: c.type?.name ?? null,
      chargeCategory: c.category?.name ?? null,
      chargeName: c.name,
      description: null,
      standardCharge: Number(c.standardCharge),
      tpaCharge: c.schedules[0] ? Number(c.schedules[0].amount) : null,
    }));
  }

  async setCharge(user: RequestUser, branchId: string, tpaId: string, chargeId: string, amount: number): Promise<TpaChargeRowDto> {
    await this.assertTpa(branchId, tpaId);
    const charge = await this.prisma.charge.findFirst({ where: { id: chargeId, branchId, deletedAt: null }, include: { category: true, type: true } });
    if (!charge) throw new NotFoundException('Charge not found');
    await this.prisma.chargeSchedule.upsert({
      where: { chargeId_tpaId: { chargeId, tpaId } },
      create: { branchId, chargeId, tpaId, amount },
      update: { amount },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'tpa_charge', entityId: `${tpaId}:${chargeId}` });
    return {
      chargeId: charge.id,
      chargeType: charge.type?.name ?? null,
      chargeCategory: charge.category?.name ?? null,
      chargeName: charge.name,
      description: null,
      standardCharge: Number(charge.standardCharge),
      tpaCharge: amount,
    };
  }

  async removeCharge(user: RequestUser, branchId: string, tpaId: string, chargeId: string): Promise<void> {
    await this.assertTpa(branchId, tpaId);
    await this.prisma.chargeSchedule.deleteMany({ where: { chargeId, tpaId, branchId } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'tpa_charge', entityId: `${tpaId}:${chargeId}` });
  }

  /** Bulk-set TPA charges, matching rows to charges by (case-insensitive) name. */
  async importCharges(user: RequestUser, branchId: string, tpaId: string, input: TpaChargeImportInput): Promise<TpaChargeImportResult> {
    await this.assertTpa(branchId, tpaId);
    const charges = await this.prisma.charge.findMany({ where: { branchId, deletedAt: null }, select: { id: true, name: true } });
    const byName = new Map(charges.map((c) => [c.name.trim().toLowerCase(), c.id]));
    let matched = 0;
    const skippedNames: string[] = [];
    for (const row of input.rows) {
      const chargeId = byName.get(row.chargeName.trim().toLowerCase());
      if (!chargeId) { skippedNames.push(row.chargeName); continue; }
      await this.prisma.chargeSchedule.upsert({
        where: { chargeId_tpaId: { chargeId, tpaId } },
        create: { branchId, chargeId, tpaId, amount: row.amount },
        update: { amount: row.amount },
      });
      matched++;
    }
    await this.audit.record({ branchId, userId: user.id, action: 'import', entity: 'tpa_charge', entityId: tpaId });
    return { matched, skipped: skippedNames.length, skippedNames };
  }

  /** TPA Report — every TPA-applied invoice item, joined with the negotiated rate. */
  async report(branchId: string, f: TpaReportFilters): Promise<TpaReportResult> {
    const where: Prisma.InvoiceWhereInput = {
      branchId,
      deletedAt: null,
      tpaId: f.tpaId ? f.tpaId : { not: null },
      ...(f.doctorId ? { consultantId: f.doctorId } : {}),
      ...(f.from || f.to ? { billDate: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(`${f.to}T23:59:59`) } : {}) } } : {}),
      ...(f.caseId ? { case: { caseNo: { contains: f.caseId, mode: 'insensitive' } } } : {}),
    };
    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { billDate: 'desc' },
      include: {
        patient: { select: { name: true, tpaIdNo: true } },
        case: { select: { caseNo: true } },
        items: true,
      },
    });
    const tpaIds = [...new Set(invoices.map((i) => i.tpaId).filter((x): x is string => !!x))];
    const tpaRows = tpaIds.length ? await this.prisma.tpa.findMany({ where: { id: { in: tpaIds } }, select: { id: true, name: true } }) : [];
    const tpaMap = new Map(tpaRows.map((t) => [t.id, t.name]));
    // Resolve charge + doctor lookups in bulk.
    const chargeIds = [...new Set(invoices.flatMap((i) => i.items.map((it) => it.chargeId).filter((x): x is string => !!x)))];
    const charges = chargeIds.length
      ? await this.prisma.charge.findMany({ where: { id: { in: chargeIds } }, include: { category: true, type: true, schedules: true } })
      : [];
    const chargeMap = new Map(charges.map((c) => [c.id, c]));
    const doctorIds = [...new Set(invoices.map((i) => i.consultantId).filter((x): x is string => !!x))];
    const doctors = doctorIds.length ? await this.prisma.user.findMany({ where: { id: { in: doctorIds } }, select: { id: true, name: true } }) : [];
    const doctorMap = new Map(doctors.map((d) => [d.id, d.name]));

    const rows: TpaReportRow[] = [];
    for (const inv of invoices) {
      for (const item of inv.items) {
        const charge = item.chargeId ? chargeMap.get(item.chargeId) : undefined;
        if (f.chargeCategoryId && charge?.categoryId !== f.chargeCategoryId) continue;
        if (f.chargeId && item.chargeId !== f.chargeId) continue;
        const sched = charge?.schedules.find((s) => s.tpaId === inv.tpaId);
        rows.push({
          checkupIpdNo: inv.billNo,
          caseId: inv.case?.caseNo ?? '',
          head: inv.module,
          tpaIdNo: inv.patient?.tpaIdNo ?? '',
          tpaName: (inv.tpaId ? tpaMap.get(inv.tpaId) : '') ?? '',
          patientName: inv.patient?.name ?? '',
          appointmentDate: inv.billDate.toISOString(),
          doctor: (inv.consultantId ? doctorMap.get(inv.consultantId) : '') || inv.referenceDoctor || '',
          chargeName: item.name,
          chargeCategory: charge?.category?.name ?? '',
          chargeType: charge?.type?.name ?? '',
          standardCharge: Number(item.standardCharge),
          appliedCharge: Number(item.appliedCharge),
          tpaCharge: sched ? Number(sched.amount) : Number(item.appliedCharge),
          tax: Number(item.taxPct),
          amount: Number(item.amount),
        });
      }
    }
    return { rows };
  }
}

function clean(input: TpaInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) out[k] = v === '' ? null : v;
  return out;
}

function toDto(t: {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  createdAt: Date;
}): TpaDto {
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    phone: t.phone,
    address: t.address,
    contactPerson: t.contactPerson,
    contactPhone: t.contactPhone,
    createdAt: t.createdAt.toISOString(),
  };
}
