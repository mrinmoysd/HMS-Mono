import { z } from 'zod';

/** Phase C6 — IPD profile: nurse notes, consultant register, bed history/transfer. */

const encounterRef = {
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
};

// ── Nurse Note ───────────────────────────────────────────────
export const addNurseNoteSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  nurseName: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().min(1, 'Note is required'),
  comment: z.string().trim().optional().or(z.literal('')),
});
export type AddNurseNoteInput = z.infer<typeof addNurseNoteSchema>;

export interface NurseNoteDto {
  id: string;
  nurseName: string | null;
  note: string;
  comment: string | null;
  createdByName: string | null;
  createdAt: string;
}

// ── Consultant Register ──────────────────────────────────────
export const addConsultantRegisterSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  doctorName: z.string().trim().min(1, 'Doctor is required'),
  instruction: z.string().trim().optional().or(z.literal('')),
  appliedDate: z.coerce.date(),
  consultantDate: z.coerce.date().optional(),
});
export type AddConsultantRegisterInput = z.infer<typeof addConsultantRegisterSchema>;

export interface ConsultantRegisterDto {
  id: string;
  doctorName: string;
  instruction: string | null;
  appliedDate: string;
  consultantDate: string | null;
  createdAt: string;
}

// ── Bed History / Transfer ───────────────────────────────────
export const transferBedSchema = z.object({
  bedId: z.string().uuid({ message: 'Select a bed' }),
});
export type TransferBedInput = z.infer<typeof transferBedSchema>;

export interface BedHistoryRow {
  id: string;
  bedLabel: string;
  fromDate: string;
  toDate: string | null;
  active: boolean;
}
