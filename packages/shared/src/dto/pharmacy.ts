import { z } from 'zod';

export const medicineSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categoryId: z.string().uuid({ message: 'Category is required' }),
  companyId: z.string().uuid().optional().nullable(),
  composition: z.string().trim().optional().or(z.literal('')),
  groupId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid({ message: 'Unit is required' }),
  minLevel: z.coerce.number().int().min(0).optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  boxPacking: z.string().trim().min(1, 'Box/Packing is required'),
  vatAc: z.string().trim().optional().or(z.literal('')),
  rackNumber: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  photoUrl: z.string().trim().optional().or(z.literal('')),
  salePrice: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  expiry: z.coerce.date().optional(),
});
export type MedicineInput = z.infer<typeof medicineSchema>;

/** CSV bulk import: one category applies to the whole file; rows carry raw header→value pairs. */
export const medicineImportSchema = z.object({
  categoryId: z.string().uuid({ message: 'Medicine Category is required' }),
  csv: z.string().min(1, 'Select a CSV file'),
});
export type MedicineImportInput = z.infer<typeof medicineImportSchema>;

export interface MedicineDto {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  companyId: string | null;
  companyName: string | null;
  composition: string | null;
  groupId: string | null;
  groupName: string | null;
  unitId: string | null;
  unitName: string | null;
  minLevel: number | null;
  reorderLevel: number | null;
  taxPercent: number | null;
  boxPacking: string | null;
  vatAc: string | null;
  rackNumber: string | null;
  note: string | null;
  photoUrl: string | null;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  expiry: string | null;
  isExpired: boolean;
  isOutOfStock: boolean;
  needsReorder: boolean;
}

/** A purchased batch of a medicine, shown on the medicine's "Stock" tab. */
export interface MedicineStockBatchRow {
  id: string;
  inwardDate: string;
  batchNo: string;
  purchaseNo: string;
  expiryDate: string;
  packingQty: number | null;
  purchaseRate: number;
  amount: number;
  quantity: number;
  mrp: number;
  salePrice: number;
}

export interface MedicineBadStockRow {
  id: string;
  batchNo: string | null;
  expiryDate: string | null;
  outwardDate: string;
  qty: number;
  note: string | null;
}

export interface MedicineDetailDto extends MedicineDto {
  stockBatches: MedicineStockBatchRow[];
  badStocks: MedicineBadStockRow[];
}

export const pharmaSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  contact: z.string().trim().optional().or(z.literal('')),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  drugLicenseNumber: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});
export type PharmaSupplierInput = z.infer<typeof pharmaSupplierSchema>;

export interface PharmaSupplierDto {
  id: string;
  name: string;
  contact: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  drugLicenseNumber: string | null;
  address: string | null;
  createdAt: string;
}

/** Category + Dosage value + Unit quick-pick preset. */
export const medicineDosageSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  dosage: z.string().trim().min(1, 'Dosage is required'),
  unitId: z.string().uuid().optional().nullable(),
});
export type MedicineDosageInput = z.infer<typeof medicineDosageSchema>;

export interface MedicineDosageDto {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  dosage: string;
  unitId: string | null;
  unitName: string | null;
  createdAt: string;
}

/** Generate a pharmacy sale bill: pick medicines + qty → invoice + stock decrement. */
export const pharmacyBillSchema = z.object({
  patientId: z.string().uuid({ message: 'Patient is required' }),
  consultantId: z.string().uuid().optional().nullable(),
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid(),
        name: z.string().min(1),
        qty: z.coerce.number().int().min(1),
        appliedCharge: z.coerce.number().min(0),
        discountPct: z.coerce.number().min(0).max(100).default(0),
        taxPct: z.coerce.number().min(0).max(100).default(0),
      }),
    )
    .min(1, 'Add at least one medicine'),
  payment: z
    .object({ amount: z.coerce.number().min(0).default(0), mode: z.string().default('cash') })
    .optional(),
});
export type PharmacyBillInput = z.infer<typeof pharmacyBillSchema>;

// ── Medicine Purchase (batch procurement) ─────────────────────
export const medicinePurchaseItemSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  medicineId: z.string().uuid({ message: 'Medicine is required' }),
  batchNo: z.string().trim().min(1, 'Batch No is required'),
  expiryMonth: z.coerce.date(),
  mrp: z.coerce.number().min(0),
  batchAmount: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0),
  packingQty: z.coerce.number().int().min(0).optional(),
  quantity: z.coerce.number().int().min(1),
  purchasePrice: z.coerce.number().min(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});
export type MedicinePurchaseItemInput = z.infer<typeof medicinePurchaseItemSchema>;

export const medicinePurchaseSchema = z.object({
  supplierId: z.string().uuid({ message: 'Supplier is required' }),
  billNo: z.string().trim().optional().or(z.literal('')),
  purchaseDate: z.coerce.date(),
  note: z.string().trim().optional().or(z.literal('')),
  attachmentUrl: z.string().trim().optional().or(z.literal('')),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  items: z.array(medicinePurchaseItemSchema).min(1, 'Add at least one medicine'),
  paymentMode: z.string().default('cash'),
  paymentAmount: z.coerce.number().min(0).default(0),
  paymentNote: z.string().trim().optional().or(z.literal('')),
});
export type MedicinePurchaseInput = z.infer<typeof medicinePurchaseSchema>;

export interface MedicinePurchaseDto {
  id: string;
  purchaseNo: string;
  billNo: string | null;
  purchaseDate: string;
  supplierId: string | null;
  supplierName: string | null;
  total: number;
  discount: number;
  tax: number;
  netAmount: number;
}

export interface MedicinePurchaseItemDto {
  id: string;
  medicineId: string;
  medicineName: string;
  categoryName: string | null;
  batchNo: string;
  expiryMonth: string;
  mrp: number;
  batchAmount: number;
  salePrice: number;
  packingQty: number | null;
  quantity: number;
  purchasePrice: number;
  taxPercent: number;
  amount: number;
}

export interface MedicinePurchaseDetailDto extends MedicinePurchaseDto {
  supplierContact: string | null;
  supplierContactPerson: string | null;
  supplierContactPhone: string | null;
  supplierDrugLicenseNumber: string | null;
  supplierAddress: string | null;
  note: string | null;
  attachmentUrl: string | null;
  paymentMode: string | null;
  paymentAmount: number;
  paymentNote: string | null;
  items: MedicinePurchaseItemDto[];
}

// ── Bad Stock ────────────────────────────────────────────────
export const medicineBadStockSchema = z.object({
  purchaseItemId: z.string().uuid({ message: 'Batch is required' }),
  expiryDate: z.coerce.date(),
  outwardDate: z.coerce.date(),
  qty: z.coerce.number().int().min(1),
  note: z.string().trim().optional().or(z.literal('')),
});
export type MedicineBadStockInput = z.infer<typeof medicineBadStockSchema>;

// ── Per-batch TPA rate schedule (mirrors Hospital Charges' schedule pattern) ──
export const medicineBatchTpaScheduleUpdateSchema = z.object({
  entries: z.array(
    z.object({
      tpaId: z.string().uuid(),
      rate: z.coerce.number().min(0),
    }),
  ),
});
export type MedicineBatchTpaScheduleUpdateInput = z.infer<typeof medicineBatchTpaScheduleUpdateSchema>;

export interface MedicineBatchTpaScheduleEntryDto {
  tpaId: string;
  tpaName: string;
  rate: number | null;
}

export interface MedicineBatchTpaDetailDto {
  purchaseItem: MedicinePurchaseItemDto;
  purchase: Pick<MedicinePurchaseDetailDto, 'purchaseNo' | 'billNo' | 'purchaseDate' | 'supplierName' | 'supplierContact' | 'supplierContactPerson' | 'supplierContactPhone' | 'supplierDrugLicenseNumber' | 'supplierAddress'>;
  schedule: MedicineBatchTpaScheduleEntryDto[];
}
