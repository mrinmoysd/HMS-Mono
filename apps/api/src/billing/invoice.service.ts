import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeInvoiceTotals,
  computeLineAmount,
  type InvoiceDto,
  type InvoiceItemInput,
  type ListQuery,
  type Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  abilityOf,
  assertCanAddBillingPayment,
  assertCanViewBilling,
  viewableBillingModules,
} from './billing-features';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

export interface CreateInvoiceParams {
  branchId: string;
  patientId: string;
  caseId?: string | null;
  module: string;
  items: InvoiceItemInput[];
  tpaId?: string | null;
  consultantId?: string | null;
  referenceDoctor?: string | null;
  prescriptionNo?: string | null;
  note?: string | null;
  previousReportValue?: string | null;
  createdById: string;
  initialPayment?: { amount: number; mode: string } | null;
}

/** Bill numbers are per-module so, e.g., pharmacy sales print as "PHARMAB000123". */
const MODULE_SEQUENCE_KEY: Record<string, string> = { pharmacy: 'pharmacy_bill', pathology: 'pathology_bill', radiology: 'radiology_bill', blood: 'blood_bill', ambulance: 'ambulance_bill' };

/**
 * The shared billing engine. Every clinical department creates its bill through
 * `create()` so charge math, numbering, payment and balance are identical
 * everywhere (docs/DEVELOPMENT_PLAN §6). Safe to call inside a caller's tx.
 */
/**
 * Columns a bill list may be ordered by. `patientName` and `createdByName` are
 * absent: both are resolved through relations/second queries rather than being
 * scalars on Invoice, so the database cannot order by them here.
 */
const INVOICE_SORTABLE = [
  'billNo', 'billDate', 'module', 'subtotal', 'discount', 'tax',
  'netAmount', 'paid', 'balance', 'status', 'previousReportValue',
] as const;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async create(params: CreateInvoiceParams, tx?: Prisma.TransactionClient) {
    const run = async (client: Prisma.TransactionClient) => {
      const seqKey = MODULE_SEQUENCE_KEY[params.module] ?? 'invoice';
      const billNo = await this.sequence.next(params.branchId, seqKey, client);
      const totals = computeInvoiceTotals(params.items);
      const paid = Math.min(params.initialPayment?.amount ?? 0, totals.netAmount);
      const balance = round2(totals.netAmount - paid);
      const status = paid <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : 'partial';

      const invoice = await client.invoice.create({
        data: {
          branchId: params.branchId,
          patientId: params.patientId,
          caseId: params.caseId ?? null,
          billNo,
          module: params.module,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          netAmount: totals.netAmount,
          paid,
          balance,
          status,
          tpaId: params.tpaId ?? null,
          consultantId: params.consultantId ?? null,
          referenceDoctor: params.referenceDoctor ?? null,
          prescriptionNo: params.prescriptionNo ?? null,
          note: params.note ?? null,
          previousReportValue: params.previousReportValue ?? null,
          createdById: params.createdById,
          items: {
            create: params.items.map((it) => ({
              chargeId: it.chargeId ?? null,
              name: it.name,
              standardCharge: it.standardCharge,
              appliedCharge: it.appliedCharge,
              qty: it.qty,
              discountPct: it.discountPct,
              taxPct: it.taxPct,
              amount: computeLineAmount(it),
            })),
          },
          payments:
            paid > 0
              ? {
                  create: {
                    amount: paid,
                    mode: params.initialPayment?.mode ?? 'cash',
                    createdById: params.createdById,
                  },
                }
              : undefined,
        },
      });
      return invoice;
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /** Appends charge lines to an existing invoice and recomputes totals (paid is preserved). */
  async addItems(
    user: RequestUser,
    branchId: string,
    invoiceId: string,
    items: InvoiceItemInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const invoice = await client.invoice.findFirst({
        where: { id: invoiceId, branchId, deletedAt: null },
        include: { items: true },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      await client.invoiceItem.createMany({
        data: items.map((it) => ({
          invoiceId,
          chargeId: it.chargeId ?? null,
          name: it.name,
          standardCharge: it.standardCharge,
          appliedCharge: it.appliedCharge,
          qty: it.qty,
          discountPct: it.discountPct,
          taxPct: it.taxPct,
          amount: computeLineAmount(it),
        })),
      });

      // Recompute over the full set of lines (existing + new).
      const existing: InvoiceItemInput[] = invoice.items.map((it) => ({
        name: it.name,
        standardCharge: Number(it.standardCharge),
        appliedCharge: Number(it.appliedCharge),
        qty: it.qty,
        discountPct: Number(it.discountPct),
        taxPct: Number(it.taxPct),
      }));
      const totals = computeInvoiceTotals([...existing, ...items]);
      const paid = Number(invoice.paid);
      const balance = round2(totals.netAmount - paid);
      const status = paid <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : 'partial';

      const updated = await client.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          netAmount: totals.netAmount,
          balance,
          status,
        },
        include: { ...invoiceInclude, items: true, payments: { where: { deletedAt: null }, orderBy: { paidAt: 'asc' } } },
      });
      await this.audit.record({
        branchId,
        userId: user.id,
        action: 'add_charges',
        entity: 'invoice',
        entityId: invoiceId,
        after: { added: items.length, netAmount: totals.netAmount },
      });
      const names = await this.names([updated.createdById, updated.consultantId]);
      return toDto(updated, true, names);
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /** Records a payment idempotently and recomputes paid/balance/status. */
  async addPayment(
    user: RequestUser,
    branchId: string,
    invoiceId: string,
    amount: number,
    mode: string,
    reference?: string,
  ): Promise<InvoiceDto> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, branchId, deletedAt: null } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      // "<Module> Billing Payment" is view+add — recording a payment is `add`,
      // and it is granted per module, so it is checked against this row.
      assertCanAddBillingPayment(abilityOf(user), invoice.module);

      const capped = Math.min(amount, Number(invoice.balance));
      if (capped > 0) {
        await tx.payment.create({
          data: { invoiceId, amount: capped, mode, reference, createdById: user.id },
        });
      }
      const paid = round2(Number(invoice.paid) + capped);
      const balance = round2(Number(invoice.netAmount) - paid);
      const status = paid <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : 'partial';
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { paid, balance, status },
        include: invoiceInclude,
      });
      await this.audit.record({
        branchId,
        userId: user.id,
        action: 'payment',
        entity: 'invoice',
        entityId: invoiceId,
        after: { amount: capped, mode },
      });
      const names = await this.names([updated.createdById, updated.consultantId]);
      return toDto(updated, false, names);
    });
  }

  /** Removes a payment and recomputes paid/balance/status (Pharmacy Bill Payments "delete" action). */
  async removePayment(user: RequestUser, branchId: string, invoiceId: string, paymentId: string): Promise<InvoiceDto> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, branchId, deletedAt: null } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      const payment = await tx.payment.findFirst({ where: { id: paymentId, invoiceId, deletedAt: null } });
      if (!payment) throw new NotFoundException('Payment not found');

      // Void, do not erase. Money that was taken and then reversed is evidence;
      // the row stays and every read filters deletedAt. The invoice totals below
      // are recomputed without it, so `paid` and `balance` are unaffected by its
      // survival.
      await tx.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
      const paid = round2(Number(invoice.paid) - Number(payment.amount));
      const balance = round2(Number(invoice.netAmount) - paid);
      const status = paid <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : 'partial';
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { paid, balance, status },
        include: invoiceInclude,
      });
      await this.audit.record({
        branchId,
        userId: user.id,
        action: 'payment_void',
        entity: 'invoice',
        entityId: invoiceId,
        after: { removedPaymentId: paymentId, amount: Number(payment.amount) },
      });
      const names = await this.names([updated.createdById, updated.consultantId]);
      return toDto(updated, false, names);
    });
  }

  /** Resolve staff names for the *ById columns (Invoice keeps plain FK ids, no relation). */
  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  async list(
    user: RequestUser,
    branchId: string,
    module: string | undefined,
    query: ListQuery,
  ): Promise<Paginated<InvoiceDto>> {
    const { skip, take, orderBy } = toPrismaPage(query, INVOICE_SORTABLE);
    // Billing is per module in the spec, and the module lives on the row, so
    // the narrowing happens here rather than in the guard. Without it a
    // pharmacist holding only Pharmacy Billing would read every OPD and IPD
    // bill in the branch.
    const ability = abilityOf(user);
    const viewable = viewableBillingModules(ability);
    if (module) assertCanViewBilling(ability, module);
    const where: Prisma.InvoiceWhereInput = {
      branchId,
      deletedAt: null,
      ...(module ? { module } : { module: { in: viewable } }),
      ...(query.search
        ? {
            OR: [
              { billNo: { contains: query.search, mode: 'insensitive' } },
              { patient: { name: { contains: query.search, mode: 'insensitive' } } },
              { case: { caseNo: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, skip, take, orderBy, include: invoiceInclude }),
      this.prisma.invoice.count({ where }),
    ]);
    const names = await this.names(rows.flatMap((r) => [r.createdById, r.consultantId]));
    return paginate(rows.map((r) => toDto(r, false, names)), total, query);
  }

  /**
   * Internal read — no permission check. Callers are other services hydrating a
   * bill they just wrote, and they have already been authorised by their own
   * module's guard. The user-facing read is getForUser below.
   */
  async get(branchId: string, id: string): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, branchId, deletedAt: null },
      include: { ...invoiceInclude, items: true, payments: { where: { deletedAt: null }, orderBy: { paidAt: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const names = await this.names([invoice.createdById, invoice.consultantId]);
    return toDto(invoice, true, names);
  }

  /** What the Billing hub calls: the same read, checked against this row's module. */
  async getForUser(user: RequestUser, branchId: string, id: string): Promise<InvoiceDto> {
    const dto = await this.get(branchId, id);
    assertCanViewBilling(abilityOf(user), dto.module);
    return dto;
  }

  /** Case ID lookup for the Billing hub (FRD §2.5). */
  async findByCaseNo(user: RequestUser, branchId: string, caseNo: string): Promise<InvoiceDto[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        branchId,
        deletedAt: null,
        case: { caseNo },
        module: { in: viewableBillingModules(abilityOf(user)) },
      },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
    const names = await this.names(rows.flatMap((r) => [r.createdById, r.consultantId]));
    return rows.map((r) => toDto(r, false, names));
  }
}

const invoiceInclude = {
  patient: { include: { tpa: { select: { name: true } } } },
  case: { select: { caseNo: true } },
} satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }> & {
  items?: { id: string; chargeId: string | null; name: string; standardCharge: Prisma.Decimal; appliedCharge: Prisma.Decimal; qty: number; discountPct: Prisma.Decimal; taxPct: Prisma.Decimal; amount: Prisma.Decimal }[];
  payments?: { id: string; amount: Prisma.Decimal; mode: string; reference: string | null; paidAt: Date }[];
};

function toDto(inv: InvoiceRow, withChildren = false, names: Map<string, string> = new Map()): InvoiceDto {
  return {
    id: inv.id,
    billNo: inv.billNo,
    module: inv.module,
    patientId: inv.patientId,
    patientName: inv.patient.name,
    patientPhone: inv.patient.phone,
    caseNo: inv.case?.caseNo ?? null,
    billDate: inv.billDate.toISOString(),
    subtotal: Number(inv.subtotal),
    discount: Number(inv.discount),
    tax: Number(inv.tax),
    netAmount: Number(inv.netAmount),
    paid: Number(inv.paid),
    refund: Number(inv.refund),
    balance: Number(inv.balance),
    status: inv.status,
    consultantId: inv.consultantId,
    consultantName: inv.consultantId ? names.get(inv.consultantId) ?? null : null,
    referenceDoctor: inv.referenceDoctor,
    prescriptionNo: inv.prescriptionNo,
    note: inv.note,
    previousReportValue: inv.previousReportValue,
    createdByName: inv.createdById ? names.get(inv.createdById) ?? null : null,
    tpaName: inv.patient.tpa?.name ?? null,
    tpaIdNo: inv.patient.tpaIdNo,
    tpaValidity: inv.patient.tpaValidity ? inv.patient.tpaValidity.toISOString() : null,
    patientAge: inv.patient.age,
    patientGender: inv.patient.gender,
    patientBloodGroup: inv.patient.bloodGroup,
    patientEmail: inv.patient.email,
    patientAddress: inv.patient.address,
    items:
      withChildren && inv.items
        ? inv.items.map((it) => ({
            id: it.id,
            chargeId: it.chargeId,
            name: it.name,
            standardCharge: Number(it.standardCharge),
            appliedCharge: Number(it.appliedCharge),
            qty: it.qty,
            discountPct: Number(it.discountPct),
            taxPct: Number(it.taxPct),
            amount: Number(it.amount),
          }))
        : undefined,
    payments:
      withChildren && inv.payments
        ? inv.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            mode: p.mode,
            reference: p.reference,
            paidAt: p.paidAt.toISOString(),
          }))
        : undefined,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
