import { z } from 'zod';

/** Phase C4 — encounter-scoped diagnostics: lab results, prescriptions, medication. */

const encounterRef = {
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
};

export const LAB_STATUSES = ['pending', 'reported', 'approved'] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

// ── Lab Investigation ────────────────────────────────────────
export const orderLabSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  modality: z.enum(['pathology', 'radiology']),
  testId: z.string().uuid().optional().nullable(),
  testName: z.string().trim().min(1, 'Test is required'),
  unit: z.string().trim().optional().or(z.literal('')),
  referenceRange: z.string().trim().optional().or(z.literal('')),
  sampleDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional(),
  center: z.string().trim().optional().or(z.literal('')),
});
export type OrderLabInput = z.infer<typeof orderLabSchema>;

/** Enter/update a report value (and optionally approve). */
export const reportLabSchema = z.object({
  reportValue: z.string().trim().optional().or(z.literal('')),
  previousValue: z.string().trim().optional().or(z.literal('')),
  approve: z.boolean().optional(),
});
export type ReportLabInput = z.infer<typeof reportLabSchema>;

export interface LabInvestigationDto {
  id: string;
  caseNo: string | null;
  modality: string;
  testName: string;
  unit: string | null;
  referenceRange: string | null;
  reportValue: string | null;
  previousValue: string | null;
  sampleDate: string | null;
  expectedDate: string | null;
  center: string | null;
  collectedByName: string | null;
  status: LabStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// ── Prescription ─────────────────────────────────────────────
export const prescriptionItemSchema = z.object({
  medicineId: z.string().uuid().optional().nullable(),
  medicineName: z.string().trim().min(1, 'Medicine is required'),
  dosage: z.string().trim().optional().or(z.literal('')),
  interval: z.string().trim().optional().or(z.literal('')),
  duration: z.string().trim().optional().or(z.literal('')),
  instruction: z.string().trim().optional().or(z.literal('')),
});
export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  symptoms: z.string().trim().optional().or(z.literal('')),
  findings: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  headerNote: z.string().optional().or(z.literal('')),
  footerNote: z.string().optional().or(z.literal('')),
  findingCategoryId: z.string().uuid().optional().nullable(),
  findingList: z.array(z.string()).default([]),
  findingDescription: z.string().trim().optional().or(z.literal('')),
  findingPrint: z.boolean().default(true),
  attachmentUrl: z.string().optional().or(z.literal('')),
  pathologyTestIds: z.array(z.string().uuid()).default([]),
  radiologyTestIds: z.array(z.string().uuid()).default([]),
  notifyRoles: z.array(z.string()).default([]),
  items: z.array(prescriptionItemSchema).min(1, 'Add at least one medicine'),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export interface PrescriptionItemDto {
  id: string;
  medicineName: string;
  dosage: string | null;
  interval: string | null;
  duration: string | null;
  instruction: string | null;
}
export interface PrescriptionDto {
  id: string;
  prescribedByName: string | null;
  symptoms: string | null;
  findings: string | null;
  note: string | null;
  headerNote: string | null;
  footerNote: string | null;
  findingCategoryId: string | null;
  findingCategoryName: string | null;
  findingList: string[];
  findingDescription: string | null;
  findingPrint: boolean;
  attachmentUrl: string | null;
  pathologyTestIds: string[];
  pathologyTestNames: string[];
  radiologyTestIds: string[];
  radiologyTestNames: string[];
  notifyRoles: string[];
  createdAt: string;
  items: PrescriptionItemDto[];
}

// ── Medication dose ──────────────────────────────────────────
export const addMedicationSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  medicineId: z.string().uuid().optional().nullable(),
  medicineName: z.string().trim().min(1, 'Medicine is required'),
  dosage: z.string().trim().optional().or(z.literal('')),
  dateTime: z.coerce.date().optional(),
  remarks: z.string().trim().optional().or(z.literal('')),
});
export type AddMedicationInput = z.infer<typeof addMedicationSchema>;

export interface MedicationDoseDto {
  id: string;
  medicineName: string;
  dosage: string | null;
  dateTime: string;
  remarks: string | null;
  createdByName: string | null;
}
