import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  bulkDeleteSchema,
  listQuerySchema,
  medicineBadStockSchema,
  medicineBatchTpaScheduleUpdateSchema,
  medicineDosageSchema,
  medicineImportSchema,
  medicinePurchaseSchema,
  medicineSchema,
  pharmacyBillSchema,
  pharmacyBillUpdateSchema,
  pharmaSupplierSchema,
  type BulkDeleteInput,
  type ListQuery,
  type MedicineBadStockInput,
  type MedicineBatchTpaScheduleUpdateInput,
  type MedicineDosageInput,
  type MedicineImportInput,
  type MedicineInput,
  type MedicinePurchaseInput,
  type PharmacyBillInput,
  type PharmacyBillUpdateInput,
  type PharmaSupplierInput,
} from '@smart-hospital/shared';
import { PharmacyService } from './pharmacy.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('pharmacy')
@ApiBearerAuth()
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacy: PharmacyService) {}

  @Get('medicines')
  @RequireFeature('pharmacy.medicine', 'view')
  listMedicines(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.pharmacy.listMedicines(branchId, q);
  }

  @Get('medicines/:id')
  @RequireFeature('pharmacy.medicine', 'view')
  medicineDetail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pharmacy.medicineDetail(branchId, id);
  }

  @Post('medicines')
  @RequireFeature('pharmacy.medicine', 'add')
  createMedicine(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(medicineSchema)) body: MedicineInput,
  ) {
    return this.pharmacy.createMedicine(user, branchId, body);
  }

  @Patch('medicines/:id')
  @RequireFeature('pharmacy.medicine', 'edit')
  updateMedicine(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(medicineSchema)) body: MedicineInput,
  ) {
    return this.pharmacy.updateMedicine(user, branchId, id, body);
  }

  @Post('medicines/bulk-delete')
  @HttpCode(204)
  @RequireFeature('pharmacy.medicine', 'delete')
  async deleteMedicines(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(bulkDeleteSchema)) body: BulkDeleteInput,
  ) {
    await this.pharmacy.deleteMedicines(user, branchId, body.ids);
  }

  @Post('medicines/import')
  // Import Medicine is its own feature, `10010000` — Admin and Pharmacist,
  // with view its only toggle. Bulk-loading the catalogue is not the same act
  // as adding one medicine, so Accountant and Receptionist lose it.
  @RequireFeature('pharmacy.import_medicine', 'view')
  importMedicines(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(medicineImportSchema)) body: MedicineImportInput,
  ) {
    const rows = parseCsv(body.csv);
    return this.pharmacy.importMedicines(user, branchId, body.categoryId, rows);
  }

  @Post('medicines/:id/bad-stock')
  // Bad Stock is `b10b0010` — view/add/delete, no edit. Writing off stock is
  // an add against that feature, not an edit of the medicine.
  @RequireFeature('pharmacy.medicine_bad_stock', 'add')
  createBadStock(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(medicineBadStockSchema)) body: MedicineBadStockInput,
  ) {
    return this.pharmacy.createBadStock(user, branchId, id, body);
  }

  @Post('bills')
  @RequireFeature('pharmacy.pharmacy_bill', 'add')
  generateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(pharmacyBillSchema)) body: PharmacyBillInput,
  ) {
    return this.pharmacy.generateBill(user, branchId, body);
  }

  /** Declared before any `bills/:id` route so the literal segment wins. */
  @Get('bills/next-no')
  // Read only by the create form, so it follows who may create a bill.
  @RequireFeature('pharmacy.pharmacy_bill', 'add')
  nextBillNo(@BranchId() branchId: string, @Query('patientId') patientId?: string) {
    return this.pharmacy.nextBillNo(branchId, patientId);
  }

  @Patch('bills/:id')
  @RequireFeature('pharmacy.pharmacy_bill', 'edit')
  updateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(pharmacyBillUpdateSchema)) body: PharmacyBillUpdateInput,
  ) {
    return this.pharmacy.updateBill(user, branchId, id, body);
  }

  @Delete('bills/:id')
  @HttpCode(204)
  @RequireFeature('pharmacy.pharmacy_bill', 'delete')
  deleteBill(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pharmacy.deleteBill(user, branchId, id);
  }

  // Medicine Purchase (batch procurement)
  @Get('purchases')
  @RequireFeature('pharmacy.medicine_purchase', 'view')
  listPurchases(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.pharmacy.listPurchases(branchId, q);
  }

  @Post('purchases')
  @RequireFeature('pharmacy.medicine_purchase', 'add')
  createPurchase(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(medicinePurchaseSchema)) body: MedicinePurchaseInput,
  ) {
    return this.pharmacy.createPurchase(user, branchId, body);
  }

  @Get('purchases/:id')
  @RequireFeature('pharmacy.medicine_purchase', 'view')
  purchaseDetail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pharmacy.purchaseDetail(branchId, id);
  }

  @Delete('purchases/:id')
  @HttpCode(204)
  @RequireFeature('pharmacy.medicine_purchase', 'delete')
  deletePurchase(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pharmacy.deletePurchase(user, branchId, id);
  }

  // Per-batch TPA rate schedule
  @Get('purchase-items/:id/tpa')
  @RequireFeature('pharmacy.medicine_purchase', 'view')
  batchTpaDetail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pharmacy.getBatchTpaDetail(branchId, id);
  }

  @Put('purchase-items/:id/tpa')
  // Medicine Purchase has no edit toggle (`b10b0010`), so rewriting a batch's
  // TPA schedule is gated on add — the same right that created the batch.
  @RequireFeature('pharmacy.medicine_purchase', 'add')
  updateBatchTpa(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(medicineBatchTpaScheduleUpdateSchema)) body: MedicineBatchTpaScheduleUpdateInput,
  ) {
    return this.pharmacy.updateBatchTpaSchedule(user, branchId, id, body);
  }

  // Suppliers (Setup master)
  // Suppliers and Dosages were gated on generic `setup:*`, which made them
  // Admin-only. They are Pharmacy features: the spec gives Medicine Supplier
  // full CRUD to Pharmacist (and view to Doctor), and Medicine Dosage full CRUD
  // to Pharmacist. The people who run the pharmacy can now maintain them.
  @Get('suppliers')
  @RequireFeature('pharmacy.medicine_supplier', 'view')
  listSuppliers(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.pharmacy.listSuppliers(branchId, q);
  }

  @Post('suppliers')
  @RequireFeature('pharmacy.medicine_supplier', 'add')
  createSupplier(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(pharmaSupplierSchema)) body: PharmaSupplierInput,
  ) {
    return this.pharmacy.createSupplier(user, branchId, body);
  }

  @Patch('suppliers/:id')
  @RequireFeature('pharmacy.medicine_supplier', 'edit')
  updateSupplier(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(pharmaSupplierSchema)) body: PharmaSupplierInput,
  ) {
    return this.pharmacy.updateSupplier(user, branchId, id, body);
  }

  @Delete('suppliers/:id')
  @HttpCode(204)
  @RequireFeature('pharmacy.medicine_supplier', 'delete')
  async removeSupplier(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.pharmacy.removeSupplier(user, branchId, id);
  }

  // Medicine Dosage (Setup master)
  @Get('dosages')
  @RequireFeature('pharmacy.medicine_dosage', 'view')
  listDosages(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.pharmacy.listDosages(branchId, q);
  }

  @Post('dosages')
  @RequireFeature('pharmacy.medicine_dosage', 'add')
  createDosage(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(medicineDosageSchema)) body: MedicineDosageInput,
  ) {
    return this.pharmacy.createDosage(user, branchId, body);
  }

  @Patch('dosages/:id')
  @RequireFeature('pharmacy.medicine_dosage', 'edit')
  updateDosage(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(medicineDosageSchema)) body: MedicineDosageInput,
  ) {
    return this.pharmacy.updateDosage(user, branchId, id, body);
  }

  @Delete('dosages/:id')
  @HttpCode(204)
  @RequireFeature('pharmacy.medicine_dosage', 'delete')
  async removeDosage(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.pharmacy.removeDosage(user, branchId, id);
  }
}

/** Minimal CSV parser for the Medicine bulk-import format (comma-separated, quoted fields supported). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new BadRequestException('CSV must include a header row and at least one data row');
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = parseLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}
