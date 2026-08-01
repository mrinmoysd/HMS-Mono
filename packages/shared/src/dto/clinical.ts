import { z } from 'zod';

// ── Vital types (Setup master) ───────────────────────────────
export const vitalTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  unit: z.string().trim().optional().or(z.literal('')),
  refMin: z.coerce.number().optional(),
  refMax: z.coerce.number().optional(),
  sortOrder: z.coerce.number().int().default(0),
});
export type VitalTypeInput = z.infer<typeof vitalTypeSchema>;

export interface VitalTypeDto {
  id: string;
  name: string;
  unit: string | null;
  refMin: number | null;
  refMax: number | null;
  sortOrder: number;
}

// ── Vital readings (add multiple at once) ────────────────────
export const addVitalsSchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
  readings: z
    .array(
      z.object({
        vitalTypeId: z.string().uuid(),
        value: z.string().trim().min(1),
        recordedAt: z.coerce.date().optional(),
      }),
    )
    .min(1, 'Add at least one vital'),
});
export type AddVitalsInput = z.infer<typeof addVitalsSchema>;

/** Correct a single reading's value (Vitals tab per-cell pencil action). */
export const updateVitalSchema = z.object({
  value: z.string().trim().min(1, 'Value is required'),
});
export type UpdateVitalInput = z.infer<typeof updateVitalSchema>;

export type VitalStatus = 'low' | 'normal' | 'high' | 'na';

export interface CurrentVitalDto {
  vitalTypeId: string;
  name: string;
  unit: string | null;
  value: string;
  status: VitalStatus;
  recordedAt: string;
}

export interface VitalMatrixColumn {
  vitalTypeId: string;
  name: string;
  unit: string | null;
  refMin: number | null;
  refMax: number | null;
}
export interface VitalMatrixRow {
  date: string;
  cells: Record<string, { id: string; value: string; recordedAt: string } | undefined>;
}
export interface VitalMatrixDto {
  columns: VitalMatrixColumn[];
  rows: VitalMatrixRow[];
}

// ── Findings / Symptoms ──────────────────────────────────────
export const findingSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, 'Description is required'),
});
export type FindingInput = z.infer<typeof findingSchema>;

export const addFindingRecordSchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional().nullable(),
  text: z.string().trim().min(1),
});
export type AddFindingRecordInput = z.infer<typeof addFindingRecordSchema>;

export const symptomTypeSchema = z.object({
  headId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
});
export type SymptomTypeInput = z.infer<typeof symptomTypeSchema>;

/** Setup-master rows for the clinical catalogs. */
export interface FindingDto {
  id: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
}
export interface SymptomTypeDto {
  id: string;
  title: string;
  description: string | null;
  headId: string | null;
  headName: string | null;
}

/**
 * ICD-10 code (Setup ▸ ICD-10 ▸ ICD Code). The group is a plain name catalog
 * ('icd-group'), so only the code itself needs its own schema.
 */
export const icdCodeSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  code: z.string().trim().min(1, 'Code is required'),
  description: z.string().trim().optional().or(z.literal('')),
});
export type IcdCodeInput = z.infer<typeof icdCodeSchema>;

export interface IcdCodeDto {
  id: string;
  code: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
}

export const addSymptomRecordSchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
  symptomTypeId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal('')),
});
export type AddSymptomRecordInput = z.infer<typeof addSymptomRecordSchema>;

export interface FindingRecordDto {
  id: string;
  text: string;
  createdAt: string;
}
export interface SymptomRecordDto {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

// ── Timeline ─────────────────────────────────────────────────
export const timelineEntrySchema = z.object({
  patientId: z.string().uuid(),
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Title is required'),
  date: z.coerce.date(),
  description: z.string().trim().optional().or(z.literal('')),
  fileUrl: z.string().url().optional().or(z.literal('')),
  visibleToPatient: z.boolean().default(true),
});
export type TimelineEntryInput = z.infer<typeof timelineEntrySchema>;

/** Edit an existing timeline entry (Timeline tab pencil action). */
export const updateTimelineSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  date: z.coerce.date(),
  description: z.string().trim().optional().or(z.literal('')),
  fileUrl: z.string().url().optional().or(z.literal('')),
  visibleToPatient: z.boolean().default(true),
});
export type UpdateTimelineInput = z.infer<typeof updateTimelineSchema>;

export interface TimelineEntryDto {
  id: string;
  title: string;
  date: string;
  description: string | null;
  fileUrl: string | null;
  visibleToPatient: boolean;
}

// ── Patient Profile 360 aggregation ──────────────────────────
export interface ProfileHeaderDto {
  patientId: string;
  patientNo: string;
  name: string;
  photoUrl: string | null;
  gender: string | null;
  age: string;
  guardianName: string | null;
  phone: string | null;
  tpaName: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
}
export interface ProfileVisitRow {
  id: string;
  opdNo: string;
  caseNo: string | null;
  appointmentDate: string;
  consultantName: string;
  symptoms: string | null;
  symptomDescription: string | null;
  reference: string | null;
  previousMedicalIssue: string | null;
}
export interface ProfileConsultantDto {
  id: string;
  name: string;
}
export interface MedicalHistoryPoint {
  year: number;
  opd: number;
  pharmacy: number;
  pathology: number;
  radiology: number;
  blood: number;
  ambulance: number;
}
export interface PatientProfileDto {
  header: ProfileHeaderDto;
  currentVitals: CurrentVitalDto[];
  bmi: number | null;
  allergies: string | null;
  findings: FindingRecordDto[];
  symptoms: SymptomRecordDto[];
  consultants: ProfileConsultantDto[];
  visits: ProfileVisitRow[];
  treatmentHistory: ProfileVisitRow[];
  medicalHistory: MedicalHistoryPoint[];
  timeline: TimelineEntryDto[];
}
