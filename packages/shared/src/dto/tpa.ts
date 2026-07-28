import { z } from 'zod';

/** Insurance / Third-Party Administrator (FRD §2.19). Feeds "Apply TPA" on forms. */
export const tpaSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
});
export type TpaInput = z.infer<typeof tpaSchema>;

export interface TpaDto {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  createdAt: string;
}

// ── TPA Details → charge schedule ────────────────────────────
/** The Charge Type filter on the TPA Details page (mirrors CHARGE_MODULES). */
export const TPA_CHARGE_MODULES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'opd', label: 'OPD' },
  { value: 'ipd', label: 'IPD' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'blood-bank', label: 'Blood Bank' },
  { value: 'ambulance', label: 'Ambulance' },
] as const;

/** One charge row on the TPA Details page (standard vs negotiated TPA charge). */
export interface TpaChargeRowDto {
  chargeId: string;
  chargeType: string | null;
  chargeCategory: string | null;
  chargeName: string;
  description: string | null;
  standardCharge: number;
  /** null = no TPA override saved yet (falls back to standardCharge). */
  tpaCharge: number | null;
}

/** Set/clear the negotiated TPA charge for one charge. */
export const tpaChargeUpdateSchema = z.object({
  amount: z.coerce.number().min(0),
});
export type TpaChargeUpdateInput = z.infer<typeof tpaChargeUpdateSchema>;

/** Bulk import of TPA charges (matched to charges by name). */
export const tpaChargeImportSchema = z.object({
  rows: z
    .array(
      z.object({
        chargeName: z.string().trim().min(1),
        amount: z.coerce.number().min(0),
      }),
    )
    .min(1),
});
export type TpaChargeImportInput = z.infer<typeof tpaChargeImportSchema>;

export interface TpaChargeImportResult {
  matched: number;
  skipped: number;
  skippedNames: string[];
}

// ── TPA Report ───────────────────────────────────────────────
export interface TpaReportRow {
  checkupIpdNo: string;
  caseId: string;
  head: string;
  tpaIdNo: string;
  tpaName: string;
  patientName: string;
  appointmentDate: string;
  doctor: string;
  chargeName: string;
  chargeCategory: string;
  chargeType: string;
  standardCharge: number;
  appliedCharge: number;
  tpaCharge: number;
  tax: number;
  amount: number;
}

export interface TpaReportResult {
  rows: TpaReportRow[];
}
