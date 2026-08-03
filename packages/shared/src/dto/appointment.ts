import { z } from 'zod';
import { opdVisitSchema } from './opd';

export const APPOINTMENT_PRIORITIES = ['normal', 'urgent', 'vip'] as const;
/**
 * `consumed` is terminal and set only by the conversion action (§9.3) — it is
 * deliberately not offered on the Add/Edit form, because it asserts that an OPD
 * visit exists. `completed` stays hand-settable and means "the patient was
 * seen"; the two are not the same claim.
 */
export const APPOINTMENT_STATUSES = ['pending', 'approved', 'cancelled', 'completed', 'consumed'] as const;
/** Statuses a user may pick by hand on the appointment form. */
export const APPOINTMENT_EDITABLE_STATUSES = ['pending', 'approved', 'cancelled', 'completed'] as const;
export const APPOINTMENT_TABS = ['today', 'upcoming', 'old'] as const;
export type AppointmentTab = (typeof APPOINTMENT_TABS)[number];

/** Add Appointment (FRD §2.2). Required: patient, doctor, fees, date, status. */
export const appointmentSchema = z.object({
  patientId: z.string().uuid({ message: 'Patient is required' }),
  doctorId: z.string().uuid({ message: 'Doctor is required' }),
  apptDate: z.coerce.date(),
  shift: z.string().trim().optional().or(z.literal('')),
  slot: z.string().trim().optional().or(z.literal('')),
  fees: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  paid: z.coerce.number().min(0).default(0),
  priority: z.string().trim().default('Normal'), // master-driven (Setup → Appointment Priority)
  source: z.string().trim().optional().or(z.literal('')),
  paymentMode: z.enum(['cash', 'card', 'upi', 'tpa', 'cheque']).default('cash'),
  liveConsult: z.boolean().default(false),
  status: z.enum(APPOINTMENT_STATUSES).default('pending'),
  message: z.string().trim().optional().or(z.literal('')),
  alternateAddress: z.string().trim().optional().or(z.literal('')),
  paymentNote: z.string().trim().optional().or(z.literal('')),
  transactionId: z.string().trim().optional().or(z.literal('')),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export interface AppointmentDto {
  id: string;
  apptNo: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientGender: string | null;
  caseNo: string | null;
  doctorId: string;
  doctorName: string;
  apptDate: string;
  shift: string | null;
  slot: string | null;
  fees: number;
  discountPct: number;
  paid: number;
  priority: string;
  source: string | null;
  paymentMode: string;
  liveConsult: boolean;
  status: string;
  /** Set once converted — the OPD visit this appointment became. */
  opdVisitId: string | null;
  alternateAddress: string | null;
  message: string | null;
  createdByName: string | null;
}

/**
 * Convert an appointment into an OPD visit (blueprint §9.1 QUEUE → OPD).
 * Deliberately the full OPD visit body minus `patientId`: the patient comes
 * from the appointment and must not be overridable, or "convert" would become
 * "create a visit for somebody else".
 */
export const convertToOpdSchema = opdVisitSchema.omit({ patientId: true });
export type ConvertToOpdInput = z.infer<typeof convertToOpdSchema>;

// ── A2: detail, reschedule, doctor-wise, queue ────────────────
export interface AppointmentDetailDto extends AppointmentDto {
  patientEmail: string | null;
  patientAge: string | null;
  department: string | null;
  paymentNote: string | null;
  transactionId: string | null;
  /** Per-branch running counter, shown as "Appointment S.No." */
  serialNo: number | null;
}

/** Reschedule an appointment (edit scheduling; fee recomputed client-side from the slot config). */
export const rescheduleAppointmentSchema = z.object({
  apptDate: z.coerce.date(),
  shift: z.string().trim().optional().or(z.literal('')),
  slot: z.string().trim().optional().or(z.literal('')),
  fees: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  priority: z.string().trim().default('Normal'),
  status: z.enum(APPOINTMENT_STATUSES).default('pending'),
  liveConsult: z.boolean().default(false),
  message: z.string().trim().optional().or(z.literal('')),
  alternateAddress: z.string().trim().optional().or(z.literal('')),
  paymentNote: z.string().trim().optional().or(z.literal('')),
  transactionId: z.string().trim().optional().or(z.literal('')),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export interface DoctorWiseRow {
  id: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  email: string | null;
  date: string;
  source: string | null;
}

export interface QueueRow {
  id: string;
  patientId: string;
  patientName: string;
  apptNo: string;
  phone: string | null;
  priority: string;
  status: string;
  /** The three below exist so the queue can convert a row without a second fetch. */
  doctorId: string;
  apptDate: string;
  fees: number;
  opdVisitId: string | null;
}

export const reorderQueueSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderQueueInput = z.infer<typeof reorderQueueSchema>;
