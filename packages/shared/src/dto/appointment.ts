import { z } from 'zod';

export const APPOINTMENT_PRIORITIES = ['normal', 'urgent', 'vip'] as const;
export const APPOINTMENT_STATUSES = ['pending', 'approved', 'cancelled', 'completed'] as const;
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
  alternateAddress: string | null;
  message: string | null;
  createdByName: string | null;
}

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
}

export const reorderQueueSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderQueueInput = z.infer<typeof reorderQueueSchema>;
