import { z } from 'zod';

export const GENDERS = ['male', 'female', 'other'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const MARITAL_STATUS = ['single', 'married', 'divorced', 'widowed'] as const;

/**
 * Canonical form of a phone number for matching (Patient.phoneNormalized).
 * Strips every non-digit so "98765 43210", "98765-43210" and "9876543210"
 * all collapse to the same key. Display value (Patient.phone) is kept as typed.
 * No country/trunk-prefix logic — international formats are preserved as-is.
 * Returns null for blank/no-digit input.
 */
export function canonicalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  return digits.length > 0 ? digits : null;
}

/** Minimum canonical length before a phone lookup runs (avoids noisy matches). */
export const PHONE_LOOKUP_MIN_DIGITS = 4;

/**
 * Add/Edit Patient (FRD §2.1). UI-required fields: Name and Age.
 * Age is a free 3-part string (yy-mm-dd) per the FRD; DOB is optional/separate.
 */
export const patientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  guardianName: z.string().trim().optional().or(z.literal('')),
  gender: z.enum(GENDERS).optional(),
  dob: z.coerce.date().optional(),
  age: z.string().trim().min(1, 'Age is required'),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  maritalStatus: z.enum(MARITAL_STATUS).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  allergies: z.string().trim().optional().or(z.literal('')),
  prevMedicalIssue: z.string().trim().optional().or(z.literal('')),
  remarks: z.string().trim().optional().or(z.literal('')),
  tpaId: z.string().uuid().optional().nullable(),
  tpaIdNo: z.string().trim().optional().or(z.literal('')),
  tpaValidity: z.coerce.date().optional(),
  nationalId: z.string().trim().optional().or(z.literal('')),
  alternateNo: z.string().trim().optional().or(z.literal('')),
  customFields: z.record(z.unknown()).optional(),
});
export type PatientInput = z.infer<typeof patientSchema>;

export const updatePatientSchema = patientSchema.partial().extend({
  isDisabled: z.boolean().optional(),
  isDeceased: z.boolean().optional(),
});
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

/** Patient-list query: the universal list query + a Disabled Patient List filter. */
export const patientListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(1000).default(25),
  sort: z.string().optional(),
  disabled: z.enum(['true', 'false']).optional(),
});
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Select at least one row'),
});
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;

/**
 * Phone-lookup query: find every patient already registered under a number
 * (the shared-number checkpoint on create). Returns full PatientDto[] so a
 * matched row can be adopted directly by a picker's onCreated handler.
 */
export const phoneLookupQuerySchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
});
export type PhoneLookupQuery = z.infer<typeof phoneLookupQuerySchema>;

export interface PatientDto {
  id: string;
  patientNo: string;
  name: string;
  guardianName: string | null;
  gender: string | null;
  age: string;
  dob: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
  tpaId: string | null;
  /** Resolved TPA name — the card shows the insurer, not a UUID. */
  tpaName: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
  nationalId: string | null;
  allergies: string | null;
  isDisabled: boolean;
  isDeceased: boolean;
  createdAt: string;
}
