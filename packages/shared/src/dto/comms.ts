import { z } from 'zod';

// ── Messaging / Notifications ────────────────────────────────
export const NOTIFICATION_TYPES = ['notice', 'sms', 'email', 'credential'] as const;

/** Notice-board post (Compose / Edit New Message). */
export const noticeSchema = z.object({
  subject: z.string().trim().min(1, 'Title is required'),
  body: z.string().trim().min(1, 'Message is required'),
  noticeDate: z.coerce.date(),
  publishOn: z.coerce.date(),
  roles: z.array(z.string()).default([]),
});
export type NoticeInput = z.infer<typeof noticeSchema>;

export interface NoticeDto {
  id: string;
  subject: string;
  body: string | null;
  roles: string[];
  noticeDate: string | null;
  publishOn: string | null;
  createdByName: string | null;
  date: string;
}

/** Send SMS (Group or Individual). */
export const smsSendSchema = z.object({
  mode: z.enum(['group', 'individual']).default('group'),
  subject: z.string().trim().min(1, 'Title is required'),
  message: z.string().trim().min(1, 'Message is required'),
  templateId: z.string().trim().optional().or(z.literal('')),
  sendThrough: z.array(z.enum(['sms', 'mobile_app'])).default([]),
  roles: z.array(z.string()).default([]),
  patientId: z.string().uuid().optional().nullable(),
});
export type SmsSendInput = z.infer<typeof smsSendSchema>;

/** Send Email (Group or Individual). */
export const emailSendSchema = z.object({
  mode: z.enum(['group', 'individual']).default('group'),
  subject: z.string().trim().min(1, 'Title is required'),
  message: z.string().trim().min(1, 'Message is required'),
  attachmentUrl: z.string().optional().or(z.literal('')),
  roles: z.array(z.string()).default([]),
  patientId: z.string().uuid().optional().nullable(),
});
export type EmailSendInput = z.infer<typeof emailSendSchema>;

/** Send Patient Credential. */
export const CREDENTIAL_TYPES = [
  { value: 'login', label: 'Login Credential' },
  { value: 'forgot', label: 'Forgot Password' },
  { value: 'both', label: 'Both' },
] as const;
export const credentialSendSchema = z.object({
  credentialType: z.enum(['login', 'forgot', 'both']).default('login'),
  patientIds: z.array(z.string().uuid()).min(1, 'Select at least one patient'),
});
export type CredentialSendInput = z.infer<typeof credentialSendSchema>;

export interface PatientCredentialDto {
  id: string;
  patientNo: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string;
  password: string;
}

/** Legacy shape (kept for existing use-office notifications hook). */
export const notificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES).default('notice'),
  subject: z.string().trim().min(1, 'Subject is required'),
  body: z.string().trim().optional().or(z.literal('')),
  audience: z.string().trim().optional().or(z.literal('')),
});
export type NotificationInput = z.infer<typeof notificationSchema>;

export interface NotificationDto {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  audience: string | null;
  date: string;
}

// ── Download Center ──────────────────────────────────────────
export const contentShareSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  contentTypeId: z.string().uuid().optional().nullable(),
  sendToGroup: z.string().trim().optional().or(z.literal('')),
  fileUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
  validUpto: z.coerce.date().optional(),
});
export type ContentShareInput = z.infer<typeof contentShareSchema>;

export interface ContentShareDto {
  id: string;
  title: string;
  contentTypeName: string | null;
  sendToGroup: string | null;
  fileUrl: string | null;
  description: string | null;
  shareDate: string;
  validUpto: string | null;
}

// ── Live Consultation / Meeting ──────────────────────────────
export const liveConsultationSchema = z.object({
  kind: z.enum(['consultation', 'meeting']).default('consultation'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
  date: z.coerce.date(),
  durationMin: z.coerce.number().int().min(0).optional(),
  apiUsed: z.string().trim().optional().or(z.literal('')),
  createdFor: z.string().trim().optional().or(z.literal('')),
});
export type LiveConsultationInput = z.infer<typeof liveConsultationSchema>;

export interface LiveConsultationDto {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  date: string;
  durationMin: number | null;
  apiUsed: string | null;
  createdFor: string | null;
  status: string;
}
