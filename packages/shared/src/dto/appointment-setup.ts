import { z } from 'zod';

/** Phase A0 — appointment scheduling masters + slot engine.
 *  (Shift create/edit reuses `shiftSchema`/`ShiftInput` from dto/hr.) */

export interface ShiftDto {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
}

// ── Appointment Priority ─────────────────────────────────────
export const appointmentPrioritySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  sortOrder: z.coerce.number().int().default(0),
});
export type AppointmentPriorityInput = z.infer<typeof appointmentPrioritySchema>;

export interface AppointmentPriorityDto {
  id: string;
  name: string;
  sortOrder: number;
}

// ── Doctor Shift matrix ──────────────────────────────────────
export const toggleDoctorShiftSchema = z.object({
  doctorId: z.string().uuid(),
  shiftId: z.string().uuid(),
  active: z.boolean(),
});
export type ToggleDoctorShiftInput = z.infer<typeof toggleDoctorShiftSchema>;

export interface DoctorShiftMatrixDto {
  shifts: { id: string; name: string }[];
  doctors: { id: string; name: string; shifts: Record<string, boolean> }[];
}

// ── Slot configuration (per doctor + shift) ──────────────────
export const slotConfigSchema = z.object({
  doctorId: z.string().uuid(),
  shiftId: z.string().uuid(),
  consultationDurationMinutes: z.coerce.number().int().min(1, 'Duration is required'),
  chargeId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
});
export type SlotConfigInput = z.infer<typeof slotConfigSchema>;

export interface SlotConfigDto {
  doctorId: string;
  shiftId: string;
  consultationDurationMinutes: number | null;
  chargeId: string | null;
  amount: number;
}

// ── Generated slots + fee lookup (drives the appointment form) ──
export interface SlotDto {
  start: string; // "HH:mm"
  end: string;
  label: string; // "10:00 AM - 10:30 AM"
  available: boolean;
}

export interface DoctorFeeDto {
  amount: number;
  consultationDurationMinutes: number | null;
}
