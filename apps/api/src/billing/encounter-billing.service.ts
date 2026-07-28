import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddChargesInput,
  AddEncounterPaymentInput,
  BillingSummaryRow,
  EncounterBillingDto,
  EncounterType,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import type { RequestUser } from '../common/types/request-user';

interface EncounterContext {
  encounterId: string;
  encounterNo: string;
  patientId: string;
  patientName: string;
  patientTpaId: string | null;
  caseId: string | null;
  caseNo: string | null;
  consultantName: string;
  date: string;
  creditLimit: number | null; // IPD only
  bedLabel: string | null; // IPD only
  invoiceId: string | null; // resolved primary invoice
}

/**
 * Encounter-scoped billing (Phase C3). An OPD visit or IPD admission has one
 * primary invoice acting as its charge ledger; both share the invoice engine.
 * OPD resolves via `opdVisit.invoiceId`; IPD via its case's `ipd` invoice.
 */
@Injectable()
export class EncounterBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoiceService,
  ) {}

  private assertType(type: string): asserts type is EncounterType {
    if (type !== 'opd' && type !== 'ipd') throw new BadRequestException('Unknown encounter type');
  }

  private async loadContext(branchId: string, type: EncounterType, id: string): Promise<EncounterContext> {
    if (type === 'opd') {
      const v = await this.prisma.opdVisit.findFirst({
        where: { id, branchId, deletedAt: null },
        include: { patient: { select: { name: true, tpaId: true } }, case: { select: { caseNo: true } }, consultant: { select: { name: true } } },
      });
      if (!v) throw new NotFoundException('OPD visit not found');
      return {
        encounterId: v.id,
        encounterNo: v.opdNo,
        patientId: v.patientId,
        patientName: v.patient.name,
        patientTpaId: v.patient.tpaId,
        caseId: v.caseId,
        caseNo: v.case?.caseNo ?? null,
        consultantName: v.consultant.name,
        date: v.appointmentDate.toISOString(),
        creditLimit: null,
        bedLabel: null,
        invoiceId: v.invoiceId,
      };
    }
    const a = await this.prisma.ipdAdmission.findFirst({
      where: { id, branchId, deletedAt: null },
      include: { patient: { select: { name: true, tpaId: true } }, case: { select: { caseNo: true } }, consultant: { select: { name: true } }, bed: { select: { bedNo: true, bedGroup: { select: { name: true } } } } },
    });
    if (!a) throw new NotFoundException('IPD admission not found');
    // Primary IPD invoice = the case's earliest `ipd` invoice.
    const primary = a.caseId
      ? await this.prisma.invoice.findFirst({
          where: { branchId, module: 'ipd', caseId: a.caseId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      : null;
    return {
      encounterId: a.id,
      encounterNo: a.ipdNo,
      patientId: a.patientId,
      patientName: a.patient.name,
      patientTpaId: a.patient.tpaId,
      caseId: a.caseId,
      caseNo: a.case?.caseNo ?? null,
      consultantName: a.consultant.name,
      date: a.admissionDate.toISOString(),
      creditLimit: Number(a.creditLimit),
      bedLabel: `${a.bed.bedGroup.name} · ${a.bed.bedNo}`,
      invoiceId: primary?.id ?? null,
    };
  }

  async getBilling(branchId: string, type: string, id: string): Promise<EncounterBillingDto> {
    this.assertType(type);
    const ctx = await this.loadContext(branchId, type, id);
    const invoice = ctx.invoiceId ? await this.invoices.get(branchId, ctx.invoiceId) : null;

    const billingSummary = await this.billingSummary(branchId, ctx.caseId);
    const tpaApplied = ctx.invoiceId ? await this.invoiceHasTpa(branchId, ctx.invoiceId) : false;
    const credit =
      type === 'ipd' && ctx.creditLimit != null
        ? (() => {
            const used = billingSummary.reduce((s, r) => s + r.billed, 0);
            return { limit: ctx.creditLimit!, used, balance: round2(ctx.creditLimit! - used) };
          })()
        : null;

    return {
      encounterType: type,
      encounterId: ctx.encounterId,
      invoiceId: ctx.invoiceId,
      header: {
        encounterNo: ctx.encounterNo,
        patientId: ctx.patientId,
        patientName: ctx.patientName,
        caseNo: ctx.caseNo,
        consultantName: ctx.consultantName,
        date: ctx.date,
        bedLabel: ctx.bedLabel,
      },
      charges: invoice?.items ?? [],
      payments: invoice?.payments ?? [],
      subtotal: invoice?.subtotal ?? 0,
      discount: invoice?.discount ?? 0,
      tax: invoice?.tax ?? 0,
      netAmount: invoice?.netAmount ?? 0,
      paid: invoice?.paid ?? 0,
      balance: invoice?.balance ?? 0,
      status: invoice?.status ?? 'unpaid',
      tpaApplied,
      billingSummary,
      credit,
    };
  }

  private async invoiceHasTpa(branchId: string, invoiceId: string): Promise<boolean> {
    const inv = await this.prisma.invoice.findFirst({ where: { id: invoiceId, branchId }, select: { tpaId: true } });
    return !!inv?.tpaId;
  }

  async addCharges(user: RequestUser, branchId: string, type: string, id: string, input: AddChargesInput): Promise<EncounterBillingDto> {
    this.assertType(type);
    const ctx = await this.loadContext(branchId, type, id);
    const tpaId = input.applyTpa ? ctx.patientTpaId : null;

    if (ctx.invoiceId) {
      await this.invoices.addItems(user, branchId, ctx.invoiceId, input.items);
      if (tpaId) await this.prisma.invoice.update({ where: { id: ctx.invoiceId }, data: { tpaId } });
    } else {
      // No ledger yet (IPD admitted with no charges, or OPD with none): create it.
      const created = await this.invoices.create({
        branchId,
        patientId: ctx.patientId,
        caseId: ctx.caseId,
        module: type,
        items: input.items,
        tpaId,
        createdById: user.id,
      });
      // Keep the OPD visit pointing at its ledger for the list/detail views.
      if (type === 'opd') await this.prisma.opdVisit.update({ where: { id: ctx.encounterId }, data: { invoiceId: created.id } });
    }
    return this.getBilling(branchId, type, id);
  }

  async addPayment(user: RequestUser, branchId: string, type: string, id: string, input: AddEncounterPaymentInput): Promise<EncounterBillingDto> {
    this.assertType(type);
    const ctx = await this.loadContext(branchId, type, id);
    if (!ctx.invoiceId) throw new BadRequestException('Add charges before recording a payment');
    await this.invoices.addPayment(user, branchId, ctx.invoiceId, input.amount, input.mode, input.reference);
    return this.getBilling(branchId, type, id);
  }

  private async billingSummary(branchId: string, caseId: string | null): Promise<BillingSummaryRow[]> {
    if (!caseId) return [];
    const grouped = await this.prisma.invoice.groupBy({
      by: ['module'],
      where: { branchId, caseId, deletedAt: null },
      _sum: { netAmount: true, paid: true },
    });
    return grouped
      .map((g) => ({ module: g.module, billed: Number(g._sum.netAmount ?? 0), paid: Number(g._sum.paid ?? 0) }))
      .filter((r) => r.billed > 0 || r.paid > 0)
      .sort((a, b) => b.billed - a.billed);
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
