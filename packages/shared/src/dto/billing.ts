import { z } from 'zod';

/** A single charge line on an invoice. amount is computed server-side. */
export const invoiceItemSchema = z.object({
  chargeId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Item name is required'),
  standardCharge: z.coerce.number().min(0).default(0),
  appliedCharge: z.coerce.number().min(0),
  qty: z.coerce.number().int().min(1).default(1),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0),
  mode: z.enum(['cash', 'card', 'upi', 'tpa', 'cheque']).default('cash'),
  reference: z.string().trim().optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const BILLING_MODULES = [
  'opd',
  'ipd',
  'pharmacy',
  'pathology',
  'radiology',
  'blood',
  'ambulance',
  'appointment',
] as const;
export type BillingModule = (typeof BILLING_MODULES)[number];

export interface InvoiceItemDto {
  id: string;
  chargeId: string | null;
  name: string;
  standardCharge: number;
  appliedCharge: number;
  qty: number;
  discountPct: number;
  taxPct: number;
  amount: number;
}

export interface PaymentDto {
  id: string;
  amount: number;
  mode: string;
  reference: string | null;
  paidAt: string;
}

export interface InvoiceDto {
  id: string;
  billNo: string;
  module: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  caseNo: string | null;
  billDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  netAmount: number;
  paid: number;
  refund: number;
  balance: number;
  status: string;
  consultantId: string | null;
  consultantName: string | null;
  referenceDoctor: string | null;
  prescriptionNo: string | null;
  note: string | null;
  createdByName: string | null;
  tpaName: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
  patientAge: string | null;
  patientGender: string | null;
  patientBloodGroup: string | null;
  patientEmail: string | null;
  patientAddress: string | null;
  items?: InvoiceItemDto[];
  payments?: PaymentDto[];
}

/**
 * Pure line-amount computation shared by API and UI so the charge editor and the
 * server agree exactly: amount = appliedCharge × qty, less discount%, plus tax%.
 */
export function computeLineAmount(item: {
  appliedCharge: number;
  qty: number;
  discountPct: number;
  taxPct: number;
}): number {
  const gross = item.appliedCharge * item.qty;
  const afterDiscount = gross * (1 - item.discountPct / 100);
  const afterTax = afterDiscount * (1 + item.taxPct / 100);
  return round2(afterTax);
}

export function computeInvoiceTotals(items: InvoiceItemInput[]): {
  subtotal: number;
  discount: number;
  tax: number;
  netAmount: number;
} {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const it of items) {
    const gross = it.appliedCharge * it.qty;
    const disc = gross * (it.discountPct / 100);
    const taxed = (gross - disc) * (it.taxPct / 100);
    subtotal += gross;
    discount += disc;
    tax += taxed;
  }
  const netAmount = subtotal - discount + tax;
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    netAmount: round2(netAmount),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
