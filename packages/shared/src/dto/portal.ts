import { z } from 'zod';

/** Patient self-registration (creates a portal login + patient record). */
export const portalRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  username: z.string().trim().min(3, 'Username (min 3 chars) is required'),
  password: z.string().min(6, 'Password (min 6 chars) is required'),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  age: z.string().trim().min(1, 'Age is required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
});
export type PortalRegisterInput = z.infer<typeof portalRegisterSchema>;

/** Patient books their own appointment. */
export const portalBookSchema = z.object({
  doctorId: z.string().uuid({ message: 'Please select a doctor' }),
  apptDate: z.coerce.date(),
  message: z.string().trim().optional().or(z.literal('')),
});
export type PortalBookInput = z.infer<typeof portalBookSchema>;

export interface PortalProfileDto {
  patientId: string;
  patientNo: string;
  name: string;
  age: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  address: string | null;
}

export interface PortalVisitDto {
  id: string;
  type: 'opd' | 'ipd';
  no: string;
  caseNo: string | null;
  consultantName: string;
  date: string;
  detail: string | null;
}

export interface PortalDoctorDto {
  id: string;
  name: string;
}
