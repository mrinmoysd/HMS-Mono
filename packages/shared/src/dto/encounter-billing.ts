import { z } from 'zod';
import { invoiceItemSchema, type InvoiceItemDto, type PaymentDto } from './billing';

/** An encounter is an OPD visit or an IPD admission (Phase C3). */
export const ENCOUNTER_TYPES = ['opd', 'ipd'] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

/** Add Charges to an encounter: one or more charge lines, optionally billed to the patient's TPA. */
export const addChargesSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Add at least one charge'),
  applyTpa: z.boolean().default(false),
});
export type AddChargesInput = z.infer<typeof addChargesSchema>;

export const addEncounterPaymentSchema = z.object({
  amount: z.coerce.number().min(0),
  mode: z.enum(['cash', 'card', 'upi', 'tpa', 'cheque']).default('cash'),
  reference: z.string().trim().optional(),
});
export type AddEncounterPaymentInput = z.infer<typeof addEncounterPaymentSchema>;

/** Per-department billed/paid for a case (drives the billing-summary progress bars). */
export interface BillingSummaryRow {
  module: string;
  billed: number;
  paid: number;
}

/** IPD credit gauge (drives the credit donut). */
export interface EncounterCreditDto {
  limit: number;
  used: number;
  balance: number;
}

export interface EncounterBillingHeaderDto {
  encounterNo: string;
  patientId: string;
  patientName: string;
  caseNo: string | null;
  consultantName: string;
  date: string;
  bedLabel: string | null; // IPD only
}

export interface EncounterBillingDto {
  encounterType: EncounterType;
  encounterId: string;
  invoiceId: string | null;
  header: EncounterBillingHeaderDto;
  charges: InvoiceItemDto[];
  payments: PaymentDto[];
  subtotal: number;
  discount: number;
  tax: number;
  netAmount: number;
  paid: number;
  balance: number;
  status: string;
  tpaApplied: boolean;
  billingSummary: BillingSummaryRow[];
  credit: EncounterCreditDto | null;
}
