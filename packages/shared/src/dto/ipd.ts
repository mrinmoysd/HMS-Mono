import { z } from 'zod';
import { invoiceItemSchema } from './billing';

export const IPD_TABS = ['admitted', 'discharged'] as const;
export type IpdTab = (typeof IPD_TABS)[number];

/** Add IPD Patient / Admission (FRD §2.4). Save allocates the bed → allotted. */
export const ipdAdmissionSchema = z.object({
  patientId: z.string().uuid({ message: 'Patient is required' }),
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  admissionDate: z.coerce.date(),
  bedId: z.string().uuid({ message: 'Bed is required' }),
  creditLimit: z.coerce.number().min(0).default(20000),
  isAntenatal: z.boolean().default(false),
  casualty: z.boolean().default(false),
  oldPatient: z.boolean().default(false),
  applyTpa: z.boolean().default(false),
  liveConsult: z.boolean().default(false),
  reference: z.string().trim().optional().or(z.literal('')),
  symptomType: z.string().trim().optional().or(z.literal('')),
  symptoms: z.string().trim().optional().or(z.literal('')),
  symptomDescription: z.string().trim().optional().or(z.literal('')),
  icd10Group: z.string().trim().optional().or(z.literal('')),
  icd10Diagnosis: z.string().trim().optional().or(z.literal('')),
  knownAllergies: z.string().trim().optional().or(z.literal('')),
  previousMedicalIssue: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  // Optional initial charges billed on admission via the shared invoice engine.
  items: z.array(invoiceItemSchema).default([]),
  payment: z
    .object({
      amount: z.coerce.number().min(0).default(0),
      mode: z.enum(['cash', 'card', 'upi', 'tpa', 'cheque']).default('cash'),
    })
    .optional(),
  customFields: z.record(z.unknown()).optional(),
});
export type IpdAdmissionInput = z.infer<typeof ipdAdmissionSchema>;

/** Edit an admission's clinical/admin fields (IPD detail-page pencil action). Bed changes go through the dedicated transfer flow. */
export const ipdAdmissionUpdateSchema = z.object({
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  admissionDate: z.coerce.date(),
  creditLimit: z.coerce.number().min(0).default(20000),
  isAntenatal: z.boolean().default(false),
  casualty: z.boolean().default(false),
  oldPatient: z.boolean().default(false),
  applyTpa: z.boolean().default(false),
  liveConsult: z.boolean().default(false),
  reference: z.string().trim().optional().or(z.literal('')),
  symptomType: z.string().trim().optional().or(z.literal('')),
  symptoms: z.string().trim().optional().or(z.literal('')),
  symptomDescription: z.string().trim().optional().or(z.literal('')),
  icd10Group: z.string().trim().optional().or(z.literal('')),
  icd10Diagnosis: z.string().trim().optional().or(z.literal('')),
  knownAllergies: z.string().trim().optional().or(z.literal('')),
  previousMedicalIssue: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
});
export type IpdAdmissionUpdateInput = z.infer<typeof ipdAdmissionUpdateSchema>;

export interface IpdAdmissionDto {
  id: string;
  ipdNo: string;
  caseNo: string | null;
  patientId: string;
  patientName: string;
  patientGender: string | null;
  patientPhone: string | null;
  consultantId: string;
  consultantName: string;
  admissionDate: string;
  bedId: string;
  bedLabel: string;
  creditLimit: number;
  isAntenatal: boolean;
  liveConsult: boolean;
  symptoms: string | null;
  previousMedicalIssue: string | null;
  createdByName: string | null;
  dischargeDate: string | null;
  status: string;
  billedAmount: number;
  paidAmount: number;
  taxAmount: number;
  balance: number;
}

/** Full read-only detail for the IPD detail-page "Edit" action + header. */
export interface IpdAdmissionDetailDto {
  id: string;
  ipdNo: string;
  caseNo: string | null;
  patientId: string;
  patientName: string;
  oldPatient: boolean;
  guardianName: string | null;
  gender: string | null;
  maritalStatus: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  age: string;
  bloodGroup: string | null;
  knownAllergies: string | null;
  admissionDate: string;
  dischargeDate: string | null;
  status: string;
  casualty: boolean;
  reference: string | null;
  tpaName: string | null;
  tpaIdNo: string | null;
  consultantId: string;
  consultantName: string;
  bedId: string;
  bedLabel: string;
  creditLimit: number;
  isAntenatal: boolean;
  applyTpa: boolean;
  liveConsult: boolean;
  note: string | null;
  symptomType: string | null;
  symptoms: string | null;
  symptomDescription: string | null;
  icd10Group: string | null;
  icd10Diagnosis: string | null;
  previousMedicalIssue: string | null;
  billedAmount: number;
  paidAmount: number;
  taxAmount: number;
  balance: number;
}

/** Read-only row for the IPD detail-page "Treatment History" tab (a patient's other admissions). */
export interface IpdTreatmentHistoryRow {
  id: string;
  ipdNo: string;
  symptoms: string | null;
  consultantName: string;
  bedLabel: string;
  admissionDate: string;
}
