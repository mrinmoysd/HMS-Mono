import { z } from 'zod';

/** Generate Certificate / Patient ID Card / Staff ID Card (FRD §2.24). */
export const CERTIFICATE_KINDS = ['certificate', 'patient_id_card', 'staff_id_card'] as const;
export type CertificateKind = (typeof CERTIFICATE_KINDS)[number];

export const generateCertificateSchema = z.object({
  kind: z.enum(CERTIFICATE_KINDS),
  templateId: z.string().uuid().optional(),
  patientIds: z.array(z.string().uuid()).default([]),
  staffIds: z.array(z.string().uuid()).default([]),
});
export type GenerateCertificateInput = z.infer<typeof generateCertificateSchema>;

export interface GeneratedDocument {
  title: string;
  html: string; // ready-to-print HTML fragment
}
export interface GenerateCertificateResult {
  documents: GeneratedDocument[];
}
