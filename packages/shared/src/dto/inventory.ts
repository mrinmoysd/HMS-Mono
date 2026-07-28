import { z } from 'zod';

// ── Item master ──────────────────────────────────────────────
export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item is required'),
  categoryId: z.string().uuid({ message: 'Item Category is required' }),
  unit: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export interface InventoryItemDto {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unit: string | null;
  description: string | null;
  availableQuantity: number;
}

// ── Item stock (purchase entries) ────────────────────────────
export const itemStockSchema = z.object({
  itemId: z.string().uuid({ message: 'Item is required' }),
  supplierId: z.string().uuid({ message: 'Supplier is required' }),
  storeId: z.string().uuid().optional().nullable(),
  qty: z.coerce.number().int().min(1),
  purchasePrice: z.coerce.number().min(0).default(0),
  date: z.coerce.date(),
  description: z.string().trim().optional().or(z.literal('')),
  documentUrl: z.string().optional().or(z.literal('')),
});
export type ItemStockInput = z.infer<typeof itemStockSchema>;

export interface ItemStockDto {
  id: string;
  itemId: string;
  itemName: string;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  storeId: string | null;
  storeName: string | null;
  date: string;
  description: string | null;
  totalQuantity: number;
  purchasePrice: number;
  documentUrl: string | null;
  generatedByName: string | null;
  generatedByNo: string | null;
}

// ── Item issue (issue + return) ──────────────────────────────
export const itemIssueSchema = z.object({
  itemId: z.string().uuid({ message: 'Item is required' }),
  userType: z.string().trim().optional().or(z.literal('')),
  issuedTo: z.string().trim().optional().or(z.literal('')),
  qty: z.coerce.number().int().min(1),
  date: z.coerce.date(),
  returnDate: z.coerce.date().optional().nullable(),
  note: z.string().trim().optional().or(z.literal('')),
});
export type ItemIssueInput = z.infer<typeof itemIssueSchema>;

export interface ItemIssueDto {
  id: string;
  itemId: string;
  itemName: string;
  categoryName: string | null;
  issueDate: string;
  returnDate: string | null;
  issuedTo: string | null;
  issuedByName: string | null;
  qty: number;
  note: string | null;
  status: string; // issued | returned
}

/** Legacy alias kept for report/other consumers. */
export interface ItemMovementDto {
  id: string;
  itemName: string;
  qty: number;
  date: string;
  issuedTo?: string | null;
  storeName?: string | null;
}

export const itemSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
});
export type ItemSupplierInput = z.infer<typeof itemSupplierSchema>;

export interface ItemSupplierDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
}
