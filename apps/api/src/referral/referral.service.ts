import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ListQuery,
  Paginated,
  ReferralCommissions,
  ReferralPatientDetailDto,
  ReferralPaymentDto,
  ReferralPaymentInput,
  ReferralPersonDto,
  ReferralPersonInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

const EMPTY_COMMISSIONS: ReferralCommissions = { opd: 0, ipd: 0, pharmacy: 0, pathology: 0, radiology: 0, bloodBank: 0, ambulance: 0 };

function toCommissions(json: Prisma.JsonValue | null | undefined): ReferralCommissions {
  const src = (json ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (v == null || Number.isNaN(Number(v)) ? 0 : Number(v));
  return {
    opd: num(src.opd),
    ipd: num(src.ipd),
    pharmacy: num(src.pharmacy),
    pathology: num(src.pathology),
    radiology: num(src.radiology),
    bloodBank: num(src.bloodBank),
    ambulance: num(src.ambulance),
  };
}

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Referral persons ─────────────────────────────────────────
  private toPersonDto(p: {
    id: string; name: string; category: string | null; phone: string | null;
    contactPerson: string | null; contactPhone: string | null; address: string | null;
    commissionPct: Prisma.Decimal; commissions: Prisma.JsonValue;
  }): ReferralPersonDto {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      phone: p.phone,
      contactPerson: p.contactPerson,
      contactPhone: p.contactPhone,
      address: p.address,
      commissionPct: Number(p.commissionPct),
      commissions: toCommissions(p.commissions),
    };
  }

  async listPersons(branchId: string, query: ListQuery): Promise<Paginated<ReferralPersonDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.ReferralPersonWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.referralPerson.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.referralPerson.count({ where }),
    ]);
    return paginate(rows.map((p) => this.toPersonDto(p)), total, query);
  }

  async createPerson(user: RequestUser, branchId: string, input: ReferralPersonInput): Promise<ReferralPersonDto> {
    const p = await this.prisma.referralPerson.create({
      data: {
        branchId,
        name: input.name,
        category: input.category || null,
        phone: input.phone || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        address: input.address || null,
        commissionPct: input.commissionPct,
        commissions: input.commissions as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'referral_person', entityId: p.id });
    return this.toPersonDto(p);
  }

  async updatePerson(user: RequestUser, branchId: string, id: string, input: ReferralPersonInput): Promise<ReferralPersonDto> {
    const existing = await this.prisma.referralPerson.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Referral person not found');
    const p = await this.prisma.referralPerson.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category || null,
        phone: input.phone || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        address: input.address || null,
        commissionPct: input.commissionPct,
        commissions: input.commissions as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'referral_person', entityId: id });
    return this.toPersonDto(p);
  }

  async removePerson(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.referralPerson.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Referral person not found');
    await this.prisma.referralPerson.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'referral_person', entityId: id });
  }

  // ── Referral payments ────────────────────────────────────────
  private toPaymentDto(r: {
    id: string; referralPersonId: string; referralPerson: { name: string };
    patientId: string | null; patientType: string | null; patientName: string | null;
    billNo: string | null; billAmount: Prisma.Decimal; commissionPct: Prisma.Decimal; commissionAmount: Prisma.Decimal; createdAt: Date;
  }): ReferralPaymentDto {
    return {
      id: r.id,
      referralPersonId: r.referralPersonId,
      payeeName: r.referralPerson.name,
      patientId: r.patientId,
      patientType: r.patientType,
      patientName: r.patientName,
      billNo: r.billNo,
      billAmount: Number(r.billAmount),
      commissionPct: Number(r.commissionPct),
      commissionAmount: Number(r.commissionAmount),
      createdAt: r.createdAt.toISOString(),
    };
  }

  async listPayments(branchId: string, query: ListQuery): Promise<Paginated<ReferralPaymentDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.ReferralPaymentWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { OR: [{ patientName: { contains: query.search, mode: 'insensitive' } }, { billNo: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.referralPayment.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { referralPerson: true } }),
      this.prisma.referralPayment.count({ where }),
    ]);
    return paginate(rows.map((r) => this.toPaymentDto(r)), total, query);
  }

  private resolveCommission(input: ReferralPaymentInput, person: { commissionPct: Prisma.Decimal; commissions: Prisma.JsonValue }): { pct: number; amount: number } {
    // Priority: explicit % → module-specific % → person standard %.
    let pct = input.commissionPct;
    if (pct == null && input.patientType) {
      const mod = toCommissions(person.commissions);
      const key = input.patientType.toLowerCase();
      const map: Record<string, number> = { opd: mod.opd, ipd: mod.ipd, pharmacy: mod.pharmacy, pathology: mod.pathology, radiology: mod.radiology, blood: mod.bloodBank, 'blood-bank': mod.bloodBank, bloodbank: mod.bloodBank, ambulance: mod.ambulance };
      if (map[key] != null) pct = map[key];
    }
    if (pct == null) pct = Number(person.commissionPct);
    const amount = input.commissionAmount != null
      ? input.commissionAmount
      : Math.round(((input.billAmount * pct) / 100 + Number.EPSILON) * 100) / 100;
    return { pct, amount };
  }

  async createPayment(user: RequestUser, branchId: string, input: ReferralPaymentInput): Promise<ReferralPaymentDto> {
    const person = await this.prisma.referralPerson.findFirst({ where: { id: input.referralPersonId, branchId, deletedAt: null } });
    if (!person) throw new NotFoundException('Payee not found');
    const { pct, amount } = this.resolveCommission(input, person);
    const payment = await this.prisma.referralPayment.create({
      data: {
        branchId,
        referralPersonId: person.id,
        patientId: input.patientId ?? null,
        patientType: input.patientType || null,
        patientName: input.patientName || null,
        billNo: input.billNo || null,
        billAmount: input.billAmount,
        commissionPct: pct,
        commissionAmount: amount,
        createdById: user.id,
      },
      include: { referralPerson: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'referral_payment', entityId: payment.id });
    return this.toPaymentDto(payment);
  }

  async updatePayment(user: RequestUser, branchId: string, id: string, input: ReferralPaymentInput): Promise<ReferralPaymentDto> {
    const existing = await this.prisma.referralPayment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Referral payment not found');
    const person = await this.prisma.referralPerson.findFirst({ where: { id: input.referralPersonId, branchId, deletedAt: null } });
    if (!person) throw new NotFoundException('Payee not found');
    const { pct, amount } = this.resolveCommission(input, person);
    const payment = await this.prisma.referralPayment.update({
      where: { id },
      data: {
        referralPersonId: person.id,
        patientId: input.patientId ?? null,
        patientType: input.patientType || null,
        patientName: input.patientName || null,
        billNo: input.billNo || null,
        billAmount: input.billAmount,
        commissionPct: pct,
        commissionAmount: amount,
      },
      include: { referralPerson: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'referral_payment', entityId: id });
    return this.toPaymentDto(payment);
  }

  async removePayment(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.referralPayment.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Referral payment not found');
    await this.prisma.referralPayment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'referral_payment', entityId: id });
  }

  // ── Patient detail + bills for the Add Payment modal ─────────
  async patientDetail(branchId: string, patientId: string): Promise<ReferralPatientDetailDto> {
    const p = await this.prisma.patient.findFirst({ where: { id: patientId, branchId, deletedAt: null } });
    if (!p) throw new NotFoundException('Patient not found');
    const invoices = await this.prisma.invoice.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { billDate: 'desc' },
      select: { id: true, billNo: true, module: true, netAmount: true },
    });
    return {
      id: p.id,
      name: p.name,
      patientNo: p.patientNo,
      guardianName: p.guardianName,
      bloodGroup: p.bloodGroup,
      maritalStatus: p.maritalStatus,
      age: p.age,
      phone: p.phone,
      email: p.email,
      address: p.address,
      allergies: p.allergies,
      remarks: p.remarks,
      tpaIdNo: p.tpaIdNo,
      tpaValidity: p.tpaValidity ? p.tpaValidity.toISOString() : null,
      nationalId: p.nationalId,
      bills: invoices.map((i) => ({ invoiceId: i.id, billNo: i.billNo, module: i.module, netAmount: Number(i.netAmount) })),
    };
  }
}
