import { z } from 'zod';

export const visitorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  purposeId: z.string().uuid().optional().nullable(),
  visitTo: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  date: z.coerce.date(),
  note: z.string().trim().optional().or(z.literal('')),
});
export type VisitorInput = z.infer<typeof visitorSchema>;

export const phoneCallSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional().or(z.literal('')),
  type: z.enum(['incoming', 'outgoing']).default('incoming'),
  date: z.coerce.date(),
  note: z.string().trim().optional().or(z.literal('')),
});
export type PhoneCallInput = z.infer<typeof phoneCallSchema>;

export const postalComplaintSchema = z.object({
  name: z.string().trim().optional().or(z.literal('')),
  complaintTypeId: z.string().uuid().optional().nullable(),
  source: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().min(1, 'Description is required'),
  date: z.coerce.date(),
  actionTaken: z.string().trim().optional().or(z.literal('')),
});
export type PostalComplaintInput = z.infer<typeof postalComplaintSchema>;

export interface VisitorDto {
  id: string;
  name: string;
  purposeName: string | null;
  visitTo: string | null;
  phone: string | null;
  date: string;
  note: string | null;
}
export interface PhoneCallDto {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  date: string;
  note: string | null;
}
export interface PostalComplaintDto {
  id: string;
  name: string | null;
  complaintTypeName: string | null;
  source: string | null;
  phone: string | null;
  description: string | null;
  date: string;
  actionTaken: string | null;
}
