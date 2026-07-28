import { z } from 'zod';

/** Phase C5 — encounter-scoped Operations (OT) and Live Consultation. */

const encounterRef = {
  encounterType: z.enum(['opd', 'ipd']).optional(),
  encounterId: z.string().uuid().optional(),
};

// ── Operation (OT) record ────────────────────────────────────
export const createOperationSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  category: z.string().trim().optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Operation name is required'),
  date: z.coerce.date(),
  consultant: z.string().trim().optional().or(z.literal('')),
  assistant1: z.string().trim().optional().or(z.literal('')),
  assistant2: z.string().trim().optional().or(z.literal('')),
  anesthetist: z.string().trim().optional().or(z.literal('')),
  anesthesiaType: z.string().trim().optional().or(z.literal('')),
  otTechnician: z.string().trim().optional().or(z.literal('')),
  otAssistant: z.string().trim().optional().or(z.literal('')),
  result: z.string().trim().optional().or(z.literal('')),
  refNo: z.string().trim().optional().or(z.literal('')),
  remark: z.string().trim().optional().or(z.literal('')),
});
export type CreateOperationInput = z.infer<typeof createOperationSchema>;

export interface OperationRecordDto {
  id: string;
  category: string | null;
  name: string;
  date: string;
  consultant: string | null;
  assistant1: string | null;
  assistant2: string | null;
  anesthetist: string | null;
  anesthesiaType: string | null;
  otTechnician: string | null;
  otAssistant: string | null;
  result: string | null;
  refNo: string | null;
  remark: string | null;
}

// ── Live Consultation (encounter-scoped) ─────────────────────
export const LIVE_CONSULT_STATUSES = ['awaited', 'finished'] as const;
export type LiveConsultStatus = (typeof LIVE_CONSULT_STATUSES)[number];

export const createLiveConsultSchema = z.object({
  patientId: z.string().uuid(),
  ...encounterRef,
  title: z.string().trim().min(1, 'Title is required'),
  doctorName: z.string().trim().optional().or(z.literal('')),
  scheduledAt: z.coerce.date().optional(),
  joinUrl: z.string().url().optional().or(z.literal('')),
});
export type CreateLiveConsultInput = z.infer<typeof createLiveConsultSchema>;

export const updateLiveConsultStatusSchema = z.object({
  status: z.enum(LIVE_CONSULT_STATUSES),
});
export type UpdateLiveConsultStatusInput = z.infer<typeof updateLiveConsultStatusSchema>;

export interface EncounterLiveConsultDto {
  id: string;
  title: string;
  doctorName: string | null;
  status: string;
  joinUrl: string | null;
  scheduledAt: string | null;
  createdAt: string;
}
