import { z } from 'zod';
import { GENDERS, BLOOD_GROUPS } from './patient';

/** Register a birth — mother is a linked Patient (auto-resolves Case ID). */
export const birthRecordSchema = z.object({
  patientId: z.string().uuid({ message: 'Mother is required' }),
  childName: z.string().trim().min(1, 'Child name is required'),
  gender: z.enum(GENDERS, { message: 'Gender is required' }),
  weight: z.string().trim().min(1, 'Weight is required'),
  birthDate: z.coerce.date(),
  phone: z.string().trim().optional().or(z.literal('')),
  fatherName: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  report: z.string().trim().optional().or(z.literal('')),
  bloodGroup: z.enum(BLOOD_GROUPS, { message: 'Blood group is required' }),
  childPhotoUrl: z.string().optional().or(z.literal('')),
  motherPhotoUrl: z.string().optional().or(z.literal('')),
  fatherPhotoUrl: z.string().optional().or(z.literal('')),
  documentUrl: z.string().optional().or(z.literal('')),
});
export type BirthRecordInput = z.infer<typeof birthRecordSchema>;
export const birthRecordUpdateSchema = birthRecordSchema.partial();
export type BirthRecordUpdateInput = z.infer<typeof birthRecordUpdateSchema>;

/** Register a death — patient is a linked Patient (auto-resolves Case ID + Age). */
export const deathRecordSchema = z.object({
  patientId: z.string().uuid({ message: 'Patient is required' }),
  guardianName: z.string().trim().min(1, 'Guardian name is required'),
  deathDate: z.coerce.date(),
  cause: z.string().trim().optional().or(z.literal('')),
  bloodGroup: z.enum(BLOOD_GROUPS, { message: 'Blood group is required' }),
  attachmentUrl: z.string().optional().or(z.literal('')),
});
export type DeathRecordInput = z.infer<typeof deathRecordSchema>;
export const deathRecordUpdateSchema = deathRecordSchema.partial();
export type DeathRecordUpdateInput = z.infer<typeof deathRecordUpdateSchema>;

export interface BirthRecordDto {
  id: string;
  referenceNo: string;
  caseNo: string | null;
  patientId: string | null;
  patientNo: string | null;
  childName: string;
  gender: string | null;
  birthDate: string;
  motherName: string | null;
  fatherName: string | null;
  weight: string | null;
  phone: string | null;
  address: string | null;
  report: string | null;
  bloodGroup: string | null;
  childPhotoUrl: string | null;
  motherPhotoUrl: string | null;
  fatherPhotoUrl: string | null;
  documentUrl: string | null;
  createdByName: string | null;
}

export interface DeathRecordDto {
  id: string;
  referenceNo: string;
  caseNo: string | null;
  patientId: string | null;
  patientNo: string | null;
  patientName: string;
  guardianName: string | null;
  gender: string | null;
  deathDate: string;
  age: string | null;
  address: string | null;
  cause: string | null;
  bloodGroup: string | null;
  attachmentUrl: string | null;
  createdByName: string | null;
}
