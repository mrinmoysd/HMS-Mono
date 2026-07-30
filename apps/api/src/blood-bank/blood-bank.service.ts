import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeInvoiceTotals,
  type BloodBagDto,
  type BloodBagInput,
  type BloodComponentSplitInput,
  type BloodDonorDto,
  type BloodDonorInput,
  type BloodIssueDto,
  type BloodIssueInput,
  type BloodIssueNextNoDto,
  type BloodIssueUpdateInput,
  type BloodProductDto,
  type BloodProductInput,
  BLOOD_GROUPS,
  type ListQuery,
  type Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoiceService } from '../billing/invoice.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { SequenceService } from '../common/sequence/sequence.service';
import type { RequestUser } from '../common/types/request-user';

const bagInclude = { donor: true, charge: { select: { id: true, name: true } } } satisfies Prisma.BloodBagInclude;

/**
 * Columns each list may be ordered by. Without a whitelist `toPrismaPage`
 * ignores `sort` entirely, which is why these lists silently refused to sort.
 * Only DTO-backed scalar columns belong here — never relation or internal ones.
 */
const DONOR_SORTABLE = ['name', 'bloodGroup', 'gender', 'age', 'phone', 'lastDonation', 'createdAt'] as const;
const BAG_SORTABLE = ['bagNo', 'bloodGroup', 'component', 'volume', 'lot', 'status', 'donateDate', 'createdAt'] as const;
/**
 * Issue-list columns that can actually be ordered on.
 *
 * BloodIssue carries only scalar FKs — there is no `invoice` or `patient`
 * relation on the model — so bill no, patient name and the money columns cannot
 * be reached from an orderBy without a schema change. Those columns are left
 * unsortable in the UI rather than offering a control that quietly does
 * nothing, which is the bug this whole pass exists to remove.
 */
const ISSUE_ORDER_BY: Record<string, Prisma.BloodIssueOrderByWithRelationInput> = {
  issueDate: { issuedAt: 'asc' },
  technician: { technician: 'asc' },
  bagNo: { bag: { bagNo: 'asc' } },
  bloodGroup: { bag: { bloodGroup: 'asc' } },
  component: { bag: { component: 'asc' } },
  donorName: { donor: { name: 'asc' } },
};

/** Rewrite the leaf direction of a (possibly nested) orderBy built above. */
function withDirection<T>(order: T, dir: 'asc' | 'desc'): T {
  if (dir === 'asc') return order;
  const flip = (node: unknown): unknown =>
    node && typeof node === 'object'
      ? Object.fromEntries(Object.entries(node as object).map(([k, v]) => [k, flip(v)]))
      : 'desc';
  return flip(order) as T;
}
type BagRow = Prisma.BloodBagGetPayload<{ include: typeof bagInclude }>;

@Injectable()
export class BloodBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoices: InvoiceService,
    private readonly sequence: SequenceService,
  ) {}

  // ── Legacy flat products (+ live stock) — Setup masters only ─
  async listProducts(branchId: string, query: ListQuery): Promise<Paginated<BloodProductDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.BloodProductWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bloodProduct.findMany({ where, skip, take, orderBy, include: { stock: true } }),
      this.prisma.bloodProduct.count({ where }),
    ]);
    return paginate(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        bloodGroup: p.bloodGroup,
        component: p.component,
        rate: Number(p.rate),
        units: p.stock?.units ?? 0,
      })),
      total,
      query,
    );
  }

  async createProduct(user: RequestUser, branchId: string, input: BloodProductInput): Promise<BloodProductDto> {
    const p = await this.prisma.bloodProduct.create({
      data: {
        branchId,
        name: input.name,
        bloodGroup: input.bloodGroup || null,
        component: input.component || null,
        rate: input.rate,
        stock: { create: { branchId, units: 0 } },
      },
      include: { stock: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'blood_product', entityId: p.id });
    return { id: p.id, name: p.name, bloodGroup: p.bloodGroup, component: p.component, rate: Number(p.rate), units: p.stock?.units ?? 0 };
  }

  async updateProduct(user: RequestUser, branchId: string, id: string, input: BloodProductInput): Promise<BloodProductDto> {
    const existing = await this.prisma.bloodProduct.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Blood product not found');
    const p = await this.prisma.bloodProduct.update({
      where: { id },
      data: { name: input.name, bloodGroup: input.bloodGroup || null, component: input.component || null, rate: input.rate },
      include: { stock: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'blood_product', entityId: id });
    return { id: p.id, name: p.name, bloodGroup: p.bloodGroup, component: p.component, rate: Number(p.rate), units: p.stock?.units ?? 0 };
  }

  async removeProduct(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.bloodProduct.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Blood product not found');
    await this.prisma.bloodProduct.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'blood_product', entityId: id });
  }

  // ── Donors ─────────────────────────────────────────────────
  async listDonors(branchId: string, query: ListQuery): Promise<Paginated<BloodDonorDto>> {
    const { skip, take, orderBy } = toPrismaPage(query, DONOR_SORTABLE);
    const where: Prisma.BloodDonorWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bloodDonor.findMany({ where, skip, take, orderBy }),
      this.prisma.bloodDonor.count({ where }),
    ]);
    return paginate(rows.map(toDonorDto), total, query);
  }

  async getDonor(branchId: string, id: string): Promise<BloodDonorDto & { bags: BloodBagDto[] }> {
    const donor = await this.prisma.bloodDonor.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!donor) throw new NotFoundException('Donor not found');
    const bags = await this.prisma.bloodBag.findMany({
      where: { branchId, donorId: id, component: null, deletedAt: null },
      include: bagInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { ...toDonorDto(donor), bags: bags.map(toBagDto) };
  }

  async createDonor(user: RequestUser, branchId: string, input: BloodDonorInput): Promise<BloodDonorDto> {
    const donor = await this.prisma.bloodDonor.create({
      data: {
        branchId,
        name: input.name,
        bloodGroup: input.bloodGroup,
        gender: input.gender || null,
        dob: input.dob ?? null,
        age: input.age || null,
        fatherName: input.fatherName || null,
        phone: input.phone || null,
        address: input.address || null,
        lastDonation: input.lastDonation ?? null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'blood_donor', entityId: donor.id });
    return toDonorDto(donor);
  }

  async updateDonor(user: RequestUser, branchId: string, id: string, input: BloodDonorInput): Promise<BloodDonorDto> {
    const existing = await this.prisma.bloodDonor.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Donor not found');
    const donor = await this.prisma.bloodDonor.update({
      where: { id },
      data: {
        name: input.name,
        bloodGroup: input.bloodGroup,
        gender: input.gender || null,
        dob: input.dob ?? null,
        age: input.age || null,
        fatherName: input.fatherName || null,
        phone: input.phone || null,
        address: input.address || null,
        lastDonation: input.lastDonation ?? null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'blood_donor', entityId: id });
    return toDonorDto(donor);
  }

  async removeDonor(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.bloodDonor.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Donor not found');
    await this.prisma.bloodDonor.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'blood_donor', entityId: id });
  }

  // ── Bags (whole blood; component = null) ──────────────────
  async listBags(
    branchId: string,
    query: ListQuery & { kind?: 'blood' | 'component'; bloodGroup?: string; status?: string },
  ): Promise<Paginated<BloodBagDto>> {
    const { skip, take, orderBy } = toPrismaPage(query, BAG_SORTABLE);
    const where: Prisma.BloodBagWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.kind === 'blood' ? { component: null } : {}),
      ...(query.kind === 'component' ? { component: { not: null } } : {}),
      ...(query.bloodGroup ? { bloodGroup: query.bloodGroup } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { bagNo: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bloodBag.findMany({ where, skip, take, orderBy, include: bagInclude }),
      this.prisma.bloodBag.count({ where }),
    ]);
    return paginate(rows.map(toBagDto), total, query);
  }

  /** Blood Bank Status dashboard — available bag/component counts grouped by blood group. */
  async bagStatus(branchId: string): Promise<{ blood: { bloodGroup: string; count: number }[]; components: { bloodGroup: string; component: string; count: number }[] }> {
    const [blood, components] = await Promise.all([
      this.prisma.bloodBag.groupBy({
        by: ['bloodGroup'],
        where: { branchId, deletedAt: null, component: null, status: 'available' },
        _count: { _all: true },
      }),
      this.prisma.bloodBag.groupBy({
        by: ['bloodGroup', 'component'],
        where: { branchId, deletedAt: null, component: { not: null }, status: 'available' },
        _count: { _all: true },
      }),
    ]);
    // Pad to every blood group, including the ones at zero. groupBy only
    // returns groups that have rows, so an empty shelf used to render as
    // "No blood in stock" — hiding exactly the fact staff need to see, which
    // is *which* group ran out. A zero row is information; a missing row is not.
    const bloodCounts = new Map(blood.map((b) => [b.bloodGroup, b._count._all]));
    const componentCounts = new Map(
      components.map((c) => [`${c.bloodGroup}|${c.component!}`, c._count._all]),
    );
    // Same for components. The names come from every component bag on record,
    // not just the available ones, plus anything configured in Setup — otherwise
    // issuing the last Plasma bag makes the whole Plasma row disappear rather
    // than showing it at 0, which is the same bug one level down.
    const [products, seen] = await Promise.all([
      this.prisma.bloodProduct.findMany({
        where: { branchId, deletedAt: null },
        select: { component: true },
      }),
      this.prisma.bloodBag.findMany({
        where: { branchId, deletedAt: null, component: { not: null } },
        select: { component: true },
        distinct: ['component'],
      }),
    ]);
    const componentNames = [
      ...new Set(
        [...products, ...seen]
          .map((r) => r.component)
          .filter((c): c is string => !!c),
      ),
    ].sort();

    return {
      blood: BLOOD_GROUPS.map((bloodGroup) => ({
        bloodGroup,
        count: bloodCounts.get(bloodGroup) ?? 0,
      })),
      components: componentNames.flatMap((component) =>
        BLOOD_GROUPS.map((bloodGroup) => ({
          bloodGroup,
          component,
          count: componentCounts.get(`${bloodGroup}|${component}`) ?? 0,
        })),
      ),
    };
  }

  async createBag(user: RequestUser, branchId: string, input: BloodBagInput): Promise<BloodBagDto> {
    const donor = await this.prisma.bloodDonor.findFirst({ where: { id: input.donorId, branchId, deletedAt: null } });
    if (!donor) throw new NotFoundException('Donor not found');
    const charge = await this.prisma.charge.findFirst({ where: { id: input.chargeId, branchId, deletedAt: null } });
    if (!charge) throw new NotFoundException('Charge not found');

    const totals = computeInvoiceTotals([
      { name: charge.name, standardCharge: input.standardCharge, appliedCharge: input.standardCharge, qty: 1, discountPct: input.discountPct, taxPct: input.taxPct },
    ]);
    const paid = Math.min(input.payment?.amount ?? 0, totals.netAmount);

    const bag = await this.prisma.bloodBag.create({
      data: {
        branchId,
        donorId: donor.id,
        bagNo: input.bagNo,
        bloodGroup: donor.bloodGroup,
        volume: input.volume || null,
        unitType: input.unitType || null,
        lot: input.lot || null,
        institution: input.institution || null,
        donateDate: input.donateDate ?? new Date(),
        chargeId: charge.id,
        standardCharge: input.standardCharge,
        discountPct: input.discountPct,
        taxPct: input.taxPct,
        netAmount: totals.netAmount,
        paidAmount: paid,
        paymentMode: input.payment?.mode ?? null,
        note: input.note || null,
        createdById: user.id,
      },
      include: bagInclude,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'blood_bag', entityId: bag.id });
    return toBagDto(bag);
  }

  // ── Components (split a bag into named component bags) ────
  async splitComponents(user: RequestUser, branchId: string, input: BloodComponentSplitInput): Promise<BloodBagDto[]> {
    const source = await this.prisma.bloodBag.findFirst({ where: { id: input.bagId, branchId, deletedAt: null, component: null } });
    if (!source) throw new NotFoundException('Bag not found');
    if (source.status !== 'available') throw new BadRequestException('Bag is not available to split');

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = await Promise.all(
        input.items.map((item) =>
          tx.bloodBag.create({
            data: {
              branchId,
              donorId: source.donorId,
              sourceBagId: source.id,
              bagNo: item.bagNo,
              bloodGroup: source.bloodGroup,
              component: item.component,
              volume: item.volume || null,
              unitType: item.unitType || null,
              lot: item.lot || null,
              institution: item.institution || null,
              donateDate: source.donateDate,
              createdById: user.id,
            },
            include: bagInclude,
          }),
        ),
      );
      await tx.bloodBag.update({ where: { id: source.id }, data: { status: 'issued' } });
      return rows;
    });
    await this.audit.record({ branchId, userId: user.id, action: 'split', entity: 'blood_bag', entityId: source.id });
    return created.map(toBagDto);
  }

  // ── Issue (blood or component) → invoice via shared engine ─
  async listIssues(branchId: string, type: 'blood' | 'component', query: ListQuery): Promise<Paginated<BloodIssueDto>> {
    const { skip, take } = toPrismaPage(query);
    const [sortKey, sortDir] = (query.sort ?? '').split(':');
    const mapped = sortKey ? ISSUE_ORDER_BY[sortKey] : undefined;
    const orderBy: Prisma.BloodIssueOrderByWithRelationInput = mapped
      ? withDirection(mapped, sortDir === 'desc' ? 'desc' : 'asc')
      : { createdAt: 'desc' };
    let patientFilter: Prisma.BloodIssueWhereInput = {};
    if (query.search) {
      const patients = await this.prisma.patient.findMany({ where: { branchId, deletedAt: null, name: { contains: query.search, mode: 'insensitive' } }, select: { id: true } });
      patientFilter = { patientId: { in: patients.map((p) => p.id) } };
    }
    const where: Prisma.BloodIssueWhereInput = { branchId, type, ...patientFilter };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bloodIssue.findMany({ where, skip, take, orderBy, include: { bag: { include: { donor: true } } } }),
      this.prisma.bloodIssue.count({ where }),
    ]);
    const invoices = await Promise.all(rows.filter((r) => r.invoiceId).map((r) => this.invoices.get(branchId, r.invoiceId!)));
    const invMap = new Map(invoices.map((i) => [i.id, i]));
    return paginate(rows.map((r) => this.toIssueDto(r, invMap.get(r.invoiceId!)!)), total, query);
  }

  async getIssue(branchId: string, id: string): Promise<BloodIssueDto> {
    const row = await this.prisma.bloodIssue.findFirst({ where: { id, branchId }, include: { bag: { include: { donor: true } } } });
    if (!row || !row.invoiceId) throw new NotFoundException('Blood issue not found');
    const inv = await this.invoices.get(branchId, row.invoiceId);
    return this.toIssueDto(row, inv);
  }

  private toIssueDto(row: Prisma.BloodIssueGetPayload<{ include: { bag: { include: { donor: true } } } }>, inv: Awaited<ReturnType<InvoiceService['get']>>): BloodIssueDto {
    return {
      id: row.id,
      invoiceId: inv.id,
      billNo: inv.billNo,
      caseNo: inv.caseNo,
      type: row.type,
      issueDate: inv.billDate,
      patientId: inv.patientId,
      patientName: inv.patientName,
      patientGender: inv.patientGender,
      patientAge: inv.patientAge,
      bagId: row.bagId,
      bagNo: row.bag?.bagNo ?? null,
      bloodGroup: row.bag?.bloodGroup ?? null,
      component: row.bag?.component ?? null,
      donorName: row.bag?.donor?.name ?? null,
      consultantId: inv.consultantId,
      consultantName: inv.consultantName,
      referenceDoctor: inv.referenceDoctor,
      technician: row.technician,
      note: row.note,
      bloodQty: row.bloodQty,
      subtotal: inv.subtotal,
      discount: inv.discount,
      tax: inv.tax,
      netAmount: inv.netAmount,
      paid: inv.paid,
      balance: inv.balance,
      createdByName: inv.createdByName,
    };
  }

  async issue(user: RequestUser, branchId: string, input: BloodIssueInput): Promise<BloodIssueDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const caseId = patient.cases[0]?.id ?? null;

    const created = await this.prisma.$transaction(async (tx) => {
      const bag = await tx.bloodBag.findFirst({
        where: {
          id: input.bagId,
          branchId,
          deletedAt: null,
          status: 'available',
          ...(input.type === 'blood' ? { component: null } : { component: { not: null } }),
        },
      });
      if (!bag) throw new BadRequestException('Bag is not available to issue');
      await tx.bloodBag.update({ where: { id: bag.id }, data: { status: 'issued' } });

      const inv = await this.invoices.create(
        {
          branchId,
          patientId: input.patientId,
          caseId,
          module: 'blood',
          consultantId: input.consultantId || null,
          referenceDoctor: input.referenceDoctor || null,
          note: input.note || null,
          items: [
            {
              chargeId: input.chargeId ?? null,
              name: `${bag.component ?? 'Whole Blood'} (${bag.bloodGroup}) — ${bag.bagNo}`,
              standardCharge: input.standardCharge,
              appliedCharge: input.appliedCharge,
              qty: 1,
              discountPct: input.discountPct,
              taxPct: input.taxPct,
            },
          ],
          createdById: user.id,
          initialPayment: input.payment && input.payment.amount > 0 ? input.payment : null,
        },
        tx,
      );

      const row = await tx.bloodIssue.create({
        data: {
          branchId,
          bagId: bag.id,
          donorId: bag.donorId,
          patientId: input.patientId,
          invoiceId: inv.id,
          type: input.type,
          technician: input.technician || null,
          note: input.note || null,
          bloodQty: input.bloodQty || null,
          createdById: user.id,
        },
        include: { bag: { include: { donor: true } } },
      });
      return row;
    });
    await this.audit.record({ branchId, userId: user.id, action: 'issue', entity: 'blood_issue', entityId: created.id });
    const inv = await this.invoices.get(branchId, created.invoiceId!);
    return this.toIssueDto(created, inv);
  }

  /** Bill No + Case ID the Issue form shows before saving. A preview, not a reservation. */
  async nextIssueNo(branchId: string, patientId?: string): Promise<BloodIssueNextNoDto> {
    const billNo = await this.sequence.peek(branchId, 'blood_bill');
    if (!patientId) return { billNo, caseNo: null };
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
      select: { cases: { take: 1, orderBy: { createdAt: 'asc' }, select: { caseNo: true } } },
    });
    return { billNo, caseNo: patient?.cases[0]?.caseNo ?? null };
  }

  /**
   * Edit an issue's header and its bill-level discount.
   *
   * The bag is out of scope — see bloodIssueUpdateSchema. The discount is
   * applied by re-running the shared totals function over the stored invoice
   * items with the bill-level percentage substituted, so the arithmetic matches
   * how the issue was billed rather than being a second implementation.
   */
  async updateIssue(
    user: RequestUser,
    branchId: string,
    id: string,
    input: BloodIssueUpdateInput,
  ): Promise<BloodIssueDto> {
    const row = await this.prisma.bloodIssue.findFirst({ where: { id, branchId } });
    if (!row || !row.invoiceId) throw new NotFoundException('Blood issue not found');
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: row.invoiceId, deletedAt: null },
      include: { items: true },
    });
    if (!invoice) throw new NotFoundException('Bill not found');

    const invoiceData: Prisma.InvoiceUpdateInput = {
      consultantId: input.consultantId ?? null,
      referenceDoctor: input.referenceDoctor || null,
      note: input.note || null,
    };

    if (input.discountPct !== undefined) {
      const totals = computeInvoiceTotals(
        invoice.items.map((it) => ({
          name: it.name,
          standardCharge: Number(it.standardCharge),
          appliedCharge: Number(it.appliedCharge),
          qty: it.qty,
          discountPct: input.discountPct as number,
          taxPct: Number(it.taxPct),
        })),
      );
      const paid = Number(invoice.paid);
      invoiceData.subtotal = totals.subtotal;
      invoiceData.discount = totals.discount;
      invoiceData.tax = totals.tax;
      invoiceData.netAmount = totals.netAmount;
      invoiceData.balance = round2(totals.netAmount - paid);
      invoiceData.status = paid <= 0 ? 'unpaid' : paid >= totals.netAmount ? 'paid' : 'partial';
    }

    await this.prisma.$transaction([
      this.prisma.invoice.update({ where: { id: invoice.id }, data: invoiceData }),
      this.prisma.bloodIssue.update({
        where: { id },
        data: {
          technician: input.technician || null,
          bloodQty: input.bloodQty || null,
          note: input.note || null,
        },
      }),
    ]);
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'blood_issue', entityId: id });
    return this.getIssue(branchId, id);
  }

  /**
   * Void an issue: soft-delete its bill and hand the bag back to stock.
   *
   * Returning the bag is the whole point. `issue()` flips the bag to `issued`,
   * so deleting the record without undoing that would strand the bag — it would
   * never appear in stock again and never be issuable, with nothing on screen
   * explaining why. Only bags still marked `issued` are reset, so a bag that was
   * since discarded or split is left alone.
   */
  async deleteIssue(user: RequestUser, branchId: string, id: string): Promise<void> {
    const row = await this.prisma.bloodIssue.findFirst({ where: { id, branchId } });
    if (!row) throw new NotFoundException('Blood issue not found');

    await this.prisma.$transaction(async (tx) => {
      if (row.invoiceId) {
        await tx.invoice.update({ where: { id: row.invoiceId }, data: { deletedAt: new Date() } });
      }
      if (row.bagId) {
        await tx.bloodBag.updateMany({
          where: { id: row.bagId, branchId, status: 'issued' },
          data: { status: 'available' },
        });
      }
      await tx.bloodIssue.delete({ where: { id } });
    });
    await this.audit.record({
      branchId, userId: user.id, action: 'delete', entity: 'blood_issue',
      entityId: id, before: { bagId: row.bagId, invoiceId: row.invoiceId },
    });
  }

  /**
   * Discard a bag. Refused once the bag has been issued — that bag is in a
   * patient, and removing the record would make the issue reference nothing.
   */
  async removeBag(user: RequestUser, branchId: string, id: string): Promise<void> {
    const bag = await this.prisma.bloodBag.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!bag) throw new NotFoundException('Bag not found');
    if (bag.status === 'issued') {
      throw new BadRequestException('This bag has been issued and cannot be deleted. Void the issue first.');
    }
    await this.prisma.bloodBag.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({
      branchId, userId: user.id, action: 'delete', entity: 'blood_bag',
      entityId: id, before: { bagNo: bag.bagNo },
    });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toDonorDto(d: {
  id: string; name: string; bloodGroup: string; gender: string | null; dob: Date | null; age: string | null;
  fatherName: string | null; phone: string | null; address: string | null; lastDonation: Date | null; createdAt: Date;
}): BloodDonorDto {
  return {
    id: d.id,
    name: d.name,
    bloodGroup: d.bloodGroup,
    gender: d.gender,
    dob: d.dob ? d.dob.toISOString() : null,
    age: d.age,
    fatherName: d.fatherName,
    phone: d.phone,
    address: d.address,
    lastDonation: d.lastDonation ? d.lastDonation.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

function toBagDto(b: BagRow): BloodBagDto {
  return {
    id: b.id,
    donorId: b.donorId,
    donorName: b.donor?.name ?? null,
    bagNo: b.bagNo,
    bloodGroup: b.bloodGroup,
    component: b.component,
    volume: b.volume,
    unitType: b.unitType,
    lot: b.lot,
    institution: b.institution,
    donateDate: b.donateDate ? b.donateDate.toISOString() : null,
    chargeId: b.chargeId,
    chargeName: b.charge?.name ?? null,
    standardCharge: b.standardCharge ? Number(b.standardCharge) : 0,
    discountPct: Number(b.discountPct),
    taxPct: Number(b.taxPct),
    netAmount: b.netAmount ? Number(b.netAmount) : 0,
    paidAmount: Number(b.paidAmount),
    paymentMode: b.paymentMode,
    note: b.note,
    status: b.status,
    sourceBagId: b.sourceBagId,
    createdAt: b.createdAt.toISOString(),
  };
}
