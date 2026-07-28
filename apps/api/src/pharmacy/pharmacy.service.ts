import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  InvoiceDto,
  ListQuery,
  MedicineBadStockInput,
  MedicineBatchTpaDetailDto,
  MedicineBatchTpaScheduleEntryDto,
  MedicineBatchTpaScheduleUpdateInput,
  MedicineDetailDto,
  MedicineDosageDto,
  MedicineDosageInput,
  MedicineDto,
  MedicineInput,
  MedicinePurchaseDetailDto,
  MedicinePurchaseDto,
  MedicinePurchaseInput,
  Paginated,
  PharmacyBillInput,
  PharmaSupplierDto,
  PharmaSupplierInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoiceService } from '../billing/invoice.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

const medicineInclude = {
  category: true,
  companyRef: true,
  group: true,
  unitRef: true,
} satisfies Prisma.MedicineInclude;

type MedicineRow = Prisma.MedicineGetPayload<{ include: typeof medicineInclude }>;

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoices: InvoiceService,
    private readonly sequence: SequenceService,
  ) {}

  // ── Medicines ────────────────────────────────────────────────
  async listMedicines(branchId: string, query: ListQuery): Promise<Paginated<MedicineDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.MedicineWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { composition: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({ where, skip, take, orderBy, include: medicineInclude }),
      this.prisma.medicine.count({ where }),
    ]);
    return paginate(rows.map(toMedicineDto), total, query);
  }

  async medicineDetail(branchId: string, id: string): Promise<MedicineDetailDto> {
    const med = await this.prisma.medicine.findFirst({ where: { id, branchId, deletedAt: null }, include: medicineInclude });
    if (!med) throw new NotFoundException('Medicine not found');

    const [items, badStocks] = await Promise.all([
      this.prisma.medicinePurchaseItem.findMany({
        where: { branchId, medicineId: id },
        include: { purchase: { select: { purchaseNo: true, purchaseDate: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.medicineBadStock.findMany({ where: { branchId, medicineId: id }, orderBy: { outwardDate: 'desc' } }),
    ]);

    return {
      ...toMedicineDto(med),
      stockBatches: items.map((it) => ({
        id: it.id,
        inwardDate: it.purchase.purchaseDate.toISOString(),
        batchNo: it.batchNo,
        purchaseNo: it.purchase.purchaseNo,
        expiryDate: it.expiryMonth.toISOString(),
        packingQty: it.packingQty,
        purchaseRate: Number(it.purchasePrice),
        amount: Number(it.amount),
        quantity: it.quantity,
        mrp: Number(it.mrp),
        salePrice: Number(it.salePrice),
      })),
      badStocks: badStocks.map((b) => ({
        id: b.id,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        outwardDate: b.outwardDate.toISOString(),
        qty: b.qty,
        note: b.note,
      })),
    };
  }

  async createMedicine(user: RequestUser, branchId: string, input: MedicineInput): Promise<MedicineDto> {
    const med = await this.prisma.medicine.create({
      data: {
        branchId,
        name: input.name,
        categoryId: input.categoryId,
        companyId: input.companyId ?? null,
        composition: input.composition || null,
        groupId: input.groupId ?? null,
        unitId: input.unitId,
        minLevel: input.minLevel ?? null,
        reorderLevel: input.reorderLevel ?? null,
        taxPercent: input.taxPercent ?? null,
        boxPacking: input.boxPacking,
        vatAc: input.vatAc || null,
        rackNumber: input.rackNumber || null,
        note: input.note || null,
        photoUrl: input.photoUrl || null,
        salePrice: input.salePrice,
        purchasePrice: input.purchasePrice,
        stock: input.stock,
        expiry: input.expiry ?? null,
      },
      include: medicineInclude,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'medicine', entityId: med.id });
    return toMedicineDto(med);
  }

  async updateMedicine(user: RequestUser, branchId: string, id: string, input: MedicineInput): Promise<MedicineDto> {
    const existing = await this.prisma.medicine.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Medicine not found');
    const med = await this.prisma.medicine.update({
      where: { id },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        companyId: input.companyId ?? null,
        composition: input.composition || null,
        groupId: input.groupId ?? null,
        unitId: input.unitId,
        minLevel: input.minLevel ?? null,
        reorderLevel: input.reorderLevel ?? null,
        taxPercent: input.taxPercent ?? null,
        boxPacking: input.boxPacking,
        vatAc: input.vatAc || null,
        rackNumber: input.rackNumber || null,
        note: input.note || null,
        photoUrl: input.photoUrl || null,
        salePrice: input.salePrice,
        purchasePrice: input.purchasePrice,
        expiry: input.expiry ?? null,
      },
      include: medicineInclude,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'medicine', entityId: id });
    return toMedicineDto(med);
  }

  async deleteMedicines(user: RequestUser, branchId: string, ids: string[]): Promise<void> {
    await this.prisma.medicine.updateMany({
      where: { id: { in: ids }, branchId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'medicine', entityId: ids.join(',') });
  }

  /** Bulk-create medicines from a parsed CSV (Medicine, Company, Composition, Group, Unit, Min Level, Re-Order Level, VAT, Box/Packing, Note). */
  async importMedicines(
    user: RequestUser,
    branchId: string,
    categoryId: string,
    rows: Record<string, string>[],
  ): Promise<{ imported: number }> {
    const [companies, groups, units] = await Promise.all([
      this.prisma.pharmaCompany.findMany({ where: { branchId, deletedAt: null } }),
      this.prisma.medicineGroup.findMany({ where: { branchId, deletedAt: null } }),
      this.prisma.pharmaUnit.findMany({ where: { branchId, deletedAt: null } }),
    ]);
    const byName = (list: { id: string; name: string }[], name: string | undefined) =>
      name ? list.find((x) => x.name.toLowerCase() === name.toLowerCase())?.id ?? null : null;

    const data = rows
      .filter((r) => r['Medicine']?.trim())
      .map((r) => ({
        branchId,
        name: r['Medicine']!.trim(),
        categoryId,
        companyId: byName(companies, r['Company']),
        composition: r['Composition']?.trim() || null,
        groupId: byName(groups, r['Group']),
        unitId: byName(units, r['Unit']),
        minLevel: r['Min Level'] ? Number(r['Min Level']) || null : null,
        reorderLevel: r['Re-Order Level'] ? Number(r['Re-Order Level']) || null : null,
        vatAc: r['VAT']?.trim() || null,
        boxPacking: r['Box/Packing']?.trim() || '',
        note: r['Note']?.trim() || null,
      }));
    if (data.length === 0) throw new BadRequestException('No valid rows found in the CSV file');

    await this.prisma.medicine.createMany({ data });
    await this.audit.record({ branchId, userId: user.id, action: 'import', entity: 'medicine', entityId: 'bulk', after: { count: data.length } });
    return { imported: data.length };
  }

  /** Generate a pharmacy sale bill: pick medicines + qty → invoice + stock decrement. */
  async generateBill(user: RequestUser, branchId: string, input: PharmacyBillInput): Promise<InvoiceDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const caseId = patient.cases[0]?.id ?? null;

    const invoice = await this.prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const med = await tx.medicine.findFirst({ where: { id: item.medicineId, branchId, deletedAt: null } });
        if (!med) throw new NotFoundException(`Medicine not found: ${item.name}`);
        if (med.stock < item.qty) {
          throw new BadRequestException(`Insufficient stock for ${med.name} (have ${med.stock}, need ${item.qty})`);
        }
        await tx.medicine.update({ where: { id: med.id }, data: { stock: { decrement: item.qty } } });
      }
      return this.invoices.create(
        {
          branchId,
          patientId: input.patientId,
          caseId,
          module: 'pharmacy',
          consultantId: input.consultantId ?? null,
          items: input.items.map((it) => ({
            chargeId: it.medicineId,
            name: it.name,
            standardCharge: it.appliedCharge,
            appliedCharge: it.appliedCharge,
            qty: it.qty,
            discountPct: it.discountPct,
            taxPct: it.taxPct,
          })),
          createdById: user.id,
          initialPayment: input.payment && input.payment.amount > 0 ? input.payment : null,
        },
        tx,
      );
    });
    await this.audit.record({ branchId, userId: user.id, action: 'bill', entity: 'pharmacy', entityId: invoice.id });
    return this.invoices.get(branchId, invoice.id);
  }

  // ── Medicine Purchase (batch procurement) ───────────────────
  async listPurchases(branchId: string, query: ListQuery): Promise<Paginated<MedicinePurchaseDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.MedicinePurchaseWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { purchaseNo: { contains: query.search, mode: 'insensitive' } },
              { billNo: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicinePurchase.findMany({ where, skip, take, orderBy, include: { supplier: true } }),
      this.prisma.medicinePurchase.count({ where }),
    ]);
    return paginate(rows.map(toPurchaseDto), total, query);
  }

  async createPurchase(user: RequestUser, branchId: string, input: MedicinePurchaseInput): Promise<MedicinePurchaseDetailDto> {
    const purchase = await this.prisma.$transaction(async (tx) => {
      const purchaseNo = await this.sequence.next(branchId, 'pharmacy_purchase', tx);
      let subtotal = 0;
      let tax = 0;
      const itemsData = input.items.map((it) => {
        const gross = it.purchasePrice * it.quantity;
        const itemTax = gross * (it.taxPercent / 100);
        subtotal += gross;
        tax += itemTax;
        return {
          branchId,
          medicineId: it.medicineId,
          batchNo: it.batchNo,
          expiryMonth: it.expiryMonth,
          mrp: it.mrp,
          batchAmount: it.batchAmount,
          salePrice: it.salePrice,
          packingQty: it.packingQty ?? null,
          quantity: it.quantity,
          purchasePrice: it.purchasePrice,
          taxPercent: it.taxPercent,
          amount: round2(gross + itemTax),
        };
      });
      const discount = subtotal * (input.discountPct / 100);
      const netAmount = round2(subtotal - discount + tax);

      const created = await tx.medicinePurchase.create({
        data: {
          branchId,
          purchaseNo,
          billNo: input.billNo || null,
          purchaseDate: input.purchaseDate,
          supplierId: input.supplierId,
          note: input.note || null,
          attachmentUrl: input.attachmentUrl || null,
          subtotal: round2(subtotal),
          discountPct: input.discountPct,
          discount: round2(discount),
          tax: round2(tax),
          netAmount,
          paymentMode: input.paymentMode,
          paymentAmount: Math.min(input.paymentAmount, netAmount),
          paymentNote: input.paymentNote || null,
          createdById: user.id,
          items: { create: itemsData },
        },
        include: { supplier: true, items: { include: { medicine: { include: { category: true } } } } },
      });

      // Each purchased batch replenishes the medicine's available stock.
      for (const it of input.items) {
        await tx.medicine.update({ where: { id: it.medicineId }, data: { stock: { increment: it.quantity } } });
      }
      return created;
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'medicine_purchase', entityId: purchase.id });
    return toPurchaseDetailDto(purchase);
  }

  async purchaseDetail(branchId: string, id: string): Promise<MedicinePurchaseDetailDto> {
    const purchase = await this.prisma.medicinePurchase.findFirst({
      where: { id, branchId, deletedAt: null },
      include: { supplier: true, items: { include: { medicine: { include: { category: true } } } } },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return toPurchaseDetailDto(purchase);
  }

  // ── Bad Stock ────────────────────────────────────────────────
  async createBadStock(user: RequestUser, branchId: string, medicineId: string, input: MedicineBadStockInput): Promise<void> {
    const [medicine, item] = await Promise.all([
      this.prisma.medicine.findFirst({ where: { id: medicineId, branchId, deletedAt: null } }),
      this.prisma.medicinePurchaseItem.findFirst({ where: { id: input.purchaseItemId, branchId, medicineId } }),
    ]);
    if (!medicine) throw new NotFoundException('Medicine not found');
    if (!item) throw new NotFoundException('Batch not found');
    if (medicine.stock < input.qty) throw new BadRequestException('Bad stock quantity exceeds available stock');

    await this.prisma.$transaction([
      this.prisma.medicineBadStock.create({
        data: {
          branchId,
          medicineId,
          purchaseItemId: item.id,
          batchNo: item.batchNo,
          expiryDate: input.expiryDate,
          outwardDate: input.outwardDate,
          qty: input.qty,
          note: input.note || null,
          createdById: user.id,
        },
      }),
      this.prisma.medicine.update({ where: { id: medicineId }, data: { stock: { decrement: input.qty } } }),
    ]);
    await this.audit.record({ branchId, userId: user.id, action: 'bad_stock', entity: 'medicine', entityId: medicineId, after: { qty: input.qty } });
  }

  // ── Per-batch TPA rate schedule ──────────────────────────────
  async getBatchTpaDetail(branchId: string, purchaseItemId: string): Promise<MedicineBatchTpaDetailDto> {
    const item = await this.prisma.medicinePurchaseItem.findFirst({
      where: { id: purchaseItemId, branchId },
      include: { medicine: { include: { category: true } }, purchase: { include: { supplier: true } } },
    });
    if (!item) throw new NotFoundException('Batch not found');
    const schedule = await this.batchTpaSchedule(branchId, purchaseItemId);
    return {
      purchaseItem: toPurchaseItemDto(item),
      purchase: {
        purchaseNo: item.purchase.purchaseNo,
        billNo: item.purchase.billNo,
        purchaseDate: item.purchase.purchaseDate.toISOString(),
        supplierName: item.purchase.supplier?.name ?? null,
        supplierContact: item.purchase.supplier?.contact ?? null,
        supplierContactPerson: item.purchase.supplier?.contactPerson ?? null,
        supplierContactPhone: item.purchase.supplier?.contactPhone ?? null,
        supplierDrugLicenseNumber: item.purchase.supplier?.drugLicenseNumber ?? null,
        supplierAddress: item.purchase.supplier?.address ?? null,
      },
      schedule,
    };
  }

  private async batchTpaSchedule(branchId: string, purchaseItemId: string): Promise<MedicineBatchTpaScheduleEntryDto[]> {
    const [tpas, rates] = await this.prisma.$transaction([
      this.prisma.tpa.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.medicineBatchTpaRate.findMany({ where: { branchId, purchaseItemId } }),
    ]);
    const rateByTpa = new Map(rates.map((r) => [r.tpaId, Number(r.rate)]));
    return tpas.map((t) => ({ tpaId: t.id, tpaName: t.name, rate: rateByTpa.get(t.id) ?? null }));
  }

  async updateBatchTpaSchedule(
    user: RequestUser,
    branchId: string,
    purchaseItemId: string,
    input: MedicineBatchTpaScheduleUpdateInput,
  ): Promise<MedicineBatchTpaScheduleEntryDto[]> {
    const item = await this.prisma.medicinePurchaseItem.findFirst({ where: { id: purchaseItemId, branchId } });
    if (!item) throw new NotFoundException('Batch not found');

    await this.prisma.$transaction(
      input.entries.map((e) =>
        this.prisma.medicineBatchTpaRate.upsert({
          where: { purchaseItemId_tpaId: { purchaseItemId, tpaId: e.tpaId } },
          create: { branchId, purchaseItemId, tpaId: e.tpaId, rate: e.rate },
          update: { rate: e.rate },
        }),
      ),
    );
    const keep = input.entries.map((e) => e.tpaId);
    await this.prisma.medicineBatchTpaRate.deleteMany({
      where: { branchId, purchaseItemId, tpaId: keep.length ? { notIn: keep } : undefined },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'medicine_batch_tpa_rate', entityId: purchaseItemId });
    return this.batchTpaSchedule(branchId, purchaseItemId);
  }

  // ── Suppliers ────────────────────────────────────────────────
  async listSuppliers(branchId: string, query: ListQuery): Promise<Paginated<PharmaSupplierDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.PharmaSupplierWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.pharmaSupplier.findMany({ where, skip, take, orderBy }),
      this.prisma.pharmaSupplier.count({ where }),
    ]);
    return paginate(rows.map(toSupplierDto), total, query);
  }

  async createSupplier(user: RequestUser, branchId: string, input: PharmaSupplierInput): Promise<PharmaSupplierDto> {
    const s = await this.prisma.pharmaSupplier.create({
      data: {
        branchId,
        name: input.name,
        contact: input.contact || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        drugLicenseNumber: input.drugLicenseNumber || null,
        address: input.address || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'pharma_supplier', entityId: s.id });
    return toSupplierDto(s);
  }

  async updateSupplier(
    user: RequestUser,
    branchId: string,
    id: string,
    input: PharmaSupplierInput,
  ): Promise<PharmaSupplierDto> {
    const existing = await this.prisma.pharmaSupplier.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Supplier not found');
    const s = await this.prisma.pharmaSupplier.update({
      where: { id },
      data: {
        name: input.name,
        contact: input.contact || null,
        contactPerson: input.contactPerson || null,
        contactPhone: input.contactPhone || null,
        drugLicenseNumber: input.drugLicenseNumber || null,
        address: input.address || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'pharma_supplier', entityId: id });
    return toSupplierDto(s);
  }

  async removeSupplier(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.pharmaSupplier.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Supplier not found');
    await this.prisma.pharmaSupplier.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'pharma_supplier', entityId: id });
  }

  // ── Medicine Dosage (category + dosage value + unit quick-pick) ──
  async listDosages(branchId: string, query: ListQuery): Promise<Paginated<MedicineDosageDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.MedicineDosageWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { dosage: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicineDosage.findMany({ where, skip, take, orderBy, include: { category: true, unit: true } }),
      this.prisma.medicineDosage.count({ where }),
    ]);
    return paginate(rows.map(toDosageDto), total, query);
  }

  async createDosage(user: RequestUser, branchId: string, input: MedicineDosageInput): Promise<MedicineDosageDto> {
    const d = await this.prisma.medicineDosage.create({
      data: { branchId, categoryId: input.categoryId ?? null, dosage: input.dosage, unitId: input.unitId ?? null },
      include: { category: true, unit: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'medicine_dosage', entityId: d.id });
    return toDosageDto(d);
  }

  async updateDosage(
    user: RequestUser,
    branchId: string,
    id: string,
    input: MedicineDosageInput,
  ): Promise<MedicineDosageDto> {
    const existing = await this.prisma.medicineDosage.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Dosage not found');
    const d = await this.prisma.medicineDosage.update({
      where: { id },
      data: { categoryId: input.categoryId ?? null, dosage: input.dosage, unitId: input.unitId ?? null },
      include: { category: true, unit: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'medicine_dosage', entityId: id });
    return toDosageDto(d);
  }

  async removeDosage(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.medicineDosage.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Dosage not found');
    await this.prisma.medicineDosage.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'medicine_dosage', entityId: id });
  }
}

function toMedicineDto(m: MedicineRow): MedicineDto {
  const stock = m.stock;
  const reorderLevel = m.reorderLevel;
  return {
    id: m.id,
    name: m.name,
    categoryId: m.categoryId,
    categoryName: m.category?.name ?? null,
    companyId: m.companyId,
    companyName: m.companyRef?.name ?? null,
    composition: m.composition,
    groupId: m.groupId,
    groupName: m.group?.name ?? null,
    unitId: m.unitId,
    unitName: m.unitRef?.name ?? null,
    minLevel: m.minLevel,
    reorderLevel: m.reorderLevel,
    taxPercent: m.taxPercent ? Number(m.taxPercent) : null,
    boxPacking: m.boxPacking,
    vatAc: m.vatAc,
    rackNumber: m.rackNumber,
    note: m.note,
    photoUrl: m.photoUrl,
    salePrice: Number(m.salePrice),
    purchasePrice: Number(m.purchasePrice),
    stock,
    expiry: m.expiry ? m.expiry.toISOString() : null,
    isExpired: m.expiry ? m.expiry.getTime() < Date.now() : false,
    isOutOfStock: stock <= 0,
    needsReorder: reorderLevel != null && stock > 0 && stock <= reorderLevel,
  };
}

function toSupplierDto(s: {
  id: string;
  name: string;
  contact: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  drugLicenseNumber: string | null;
  address: string | null;
  createdAt: Date;
}): PharmaSupplierDto {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact,
    contactPerson: s.contactPerson,
    contactPhone: s.contactPhone,
    drugLicenseNumber: s.drugLicenseNumber,
    address: s.address,
    createdAt: s.createdAt.toISOString(),
  };
}

function toDosageDto(d: {
  id: string;
  categoryId: string | null;
  category: { name: string } | null;
  dosage: string;
  unitId: string | null;
  unit: { name: string } | null;
  createdAt: Date;
}): MedicineDosageDto {
  return {
    id: d.id,
    categoryId: d.categoryId,
    categoryName: d.category?.name ?? null,
    dosage: d.dosage,
    unitId: d.unitId,
    unitName: d.unit?.name ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

type PurchaseRow = Prisma.MedicinePurchaseGetPayload<{ include: { supplier: true } }>;
type PurchaseDetailRow = Prisma.MedicinePurchaseGetPayload<{
  include: { supplier: true; items: { include: { medicine: { include: { category: true } } } } };
}>;
type PurchaseItemRow = Prisma.MedicinePurchaseItemGetPayload<{ include: { medicine: { include: { category: true } } } }>;

function toPurchaseDto(p: PurchaseRow): MedicinePurchaseDto {
  return {
    id: p.id,
    purchaseNo: p.purchaseNo,
    billNo: p.billNo,
    purchaseDate: p.purchaseDate.toISOString(),
    supplierId: p.supplierId,
    supplierName: p.supplier?.name ?? null,
    total: Number(p.subtotal),
    discount: Number(p.discount),
    tax: Number(p.tax),
    netAmount: Number(p.netAmount),
  };
}

function toPurchaseItemDto(it: PurchaseItemRow): MedicinePurchaseDetailDto['items'][number] {
  return {
    id: it.id,
    medicineId: it.medicineId,
    medicineName: it.medicine.name,
    categoryName: it.medicine.category?.name ?? null,
    batchNo: it.batchNo,
    expiryMonth: it.expiryMonth.toISOString(),
    mrp: Number(it.mrp),
    batchAmount: Number(it.batchAmount),
    salePrice: Number(it.salePrice),
    packingQty: it.packingQty,
    quantity: it.quantity,
    purchasePrice: Number(it.purchasePrice),
    taxPercent: Number(it.taxPercent),
    amount: Number(it.amount),
  };
}

function toPurchaseDetailDto(p: PurchaseDetailRow): MedicinePurchaseDetailDto {
  return {
    ...toPurchaseDto(p),
    supplierContact: p.supplier?.contact ?? null,
    supplierContactPerson: p.supplier?.contactPerson ?? null,
    supplierContactPhone: p.supplier?.contactPhone ?? null,
    supplierDrugLicenseNumber: p.supplier?.drugLicenseNumber ?? null,
    supplierAddress: p.supplier?.address ?? null,
    note: p.note,
    attachmentUrl: p.attachmentUrl,
    paymentMode: p.paymentMode,
    paymentAmount: Number(p.paymentAmount),
    paymentNote: p.paymentNote,
    items: p.items.map(toPurchaseItemDto),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
