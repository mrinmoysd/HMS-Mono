import { z } from 'zod';
import { invoiceItemSchema } from './billing';

export const OPD_TABS = ['today', 'upcoming', 'old'] as const;
export type OpdTab = (typeof OPD_TABS)[number];

/**
 * Add OPD Patient (FRD §2.3). A visit captures symptoms + consultant and
 * generates a bill from one or more charge lines, then takes payment.
 */
export const opdVisitSchema = z.object({
  patientId: z.string().uuid({ message: 'Patient is required' }),
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  appointmentDate: z.coerce.date(),
  /**
   * Existing case number to file this visit under. Blank mints a new one —
   * a case belongs to an encounter, not to a patient, so a second visit is a
   * second case unless the user deliberately continues the first.
   */
  caseNo: z.string().trim().optional().or(z.literal('')),
  symptomType: z.string().trim().optional().or(z.literal('')),
  symptoms: z.string().trim().optional().or(z.literal('')),
  symptomDescription: z.string().trim().optional().or(z.literal('')),
  icd10Group: z.string().trim().optional().or(z.literal('')),
  icd10Diagnosis: z.string().trim().optional().or(z.literal('')),
  knownAllergies: z.string().trim().optional().or(z.literal('')),
  previousMedicalIssue: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  isAntenatal: z.boolean().default(false),
  casualty: z.boolean().default(false),
  oldPatient: z.boolean().default(false),
  applyTpa: z.boolean().default(false),
  liveConsult: z.boolean().default(false),
  reference: z.string().trim().optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one charge'),
  payment: z
    .object({
      amount: z.coerce.number().min(0).default(0),
      mode: z.enum(['cash', 'card', 'upi', 'tpa', 'cheque']).default('cash'),
    })
    .optional(),
  customFields: z.record(z.unknown()).optional(),
});
export type OpdVisitInput = z.infer<typeof opdVisitSchema>;

/**
 * Edit "Patient Details" (Visits-tab pencil, V1). Deliberately excludes items/payment —
 * charge and payment edits stay on the encounter page's dedicated Charges/Payments tabs.
 */
export const opdVisitUpdateSchema = z.object({
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  appointmentDate: z.coerce.date(),
  symptomType: z.string().trim().optional().or(z.literal('')),
  symptoms: z.string().trim().optional().or(z.literal('')),
  symptomDescription: z.string().trim().optional().or(z.literal('')),
  icd10Group: z.string().trim().optional().or(z.literal('')),
  icd10Diagnosis: z.string().trim().optional().or(z.literal('')),
  knownAllergies: z.string().trim().optional().or(z.literal('')),
  previousMedicalIssue: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  isAntenatal: z.boolean().default(false),
  casualty: z.boolean().default(false),
  oldPatient: z.boolean().default(false),
  applyTpa: z.boolean().default(false),
  liveConsult: z.boolean().default(false),
  reference: z.string().trim().optional().or(z.literal('')),
});
export type OpdVisitUpdateInput = z.infer<typeof opdVisitUpdateSchema>;

/**
 * A checkup within an OPD visit (blueprint §7.3 tab 2, prefix CHKID).
 *
 * The visit is the episode; the checkup is the patient actually being seen.
 * A follow-up on the same visit is a second checkup, not a second visit —
 * which is what "Total Recheckup" counts on the OPD Patient View.
 */
export const opdCheckupSchema = z.object({
  appointmentDate: z.coerce.date(),
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  reference: z.string().trim().optional().or(z.literal('')),
  symptoms: z.string().trim().optional().or(z.literal('')),
  findings: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
});
export type OpdCheckupInput = z.infer<typeof opdCheckupSchema>;

export interface OpdCheckupDto {
  id: string;
  checkupNo: string;
  visitId: string;
  appointmentDate: string;
  consultantId: string;
  consultantName: string;
  reference: string | null;
  symptoms: string | null;
  findings: string | null;
  note: string | null;
}

/**
 * Move Patient to IPD (Visits-tab action, V4). Server prefills patient/symptoms from the OPD
 * visit; this carries only what the modal actually asks the user to confirm/adjust. Casualty
 * and Old Patient have no IpdAdmission columns, so the service stashes them in customFields.
 */
export const moveToIpdSchema = z.object({
  consultantId: z.string().uuid({ message: 'Consultant is required' }),
  admissionDate: z.coerce.date(),
  bedId: z.string().uuid({ message: 'Bed is required' }),
  creditLimit: z.coerce.number().min(0).default(20000),
  isAntenatal: z.boolean().default(false),
  casualty: z.boolean().default(false),
  oldPatient: z.boolean().default(false),
  liveConsult: z.boolean().default(false),
  reference: z.string().trim().optional().or(z.literal('')),
});
export type MoveToIpdInput = z.infer<typeof moveToIpdSchema>;

export interface OpdVisitDto {
  id: string;
  opdNo: string;
  caseNo: string | null;
  patientId: string;
  patientName: string;
  consultantId: string;
  consultantName: string;
  appointmentDate: string;
  symptoms: string | null;
  reference: string | null;
  previousMedicalIssue: string | null;
  isAntenatal: boolean;
  createdByName: string | null;
  invoiceId: string | null;
  netAmount: number;
  paid: number;
  balance: number;
}

/** Full read-only detail for the Visits-tab "Show" modal (Patient Visit parity V0). */
export interface OpdVisitDetailDto {
  id: string;
  opdNo: string;
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
  appointmentDate: string;
  casualty: boolean;
  reference: string | null;
  tpaName: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
  consultantId: string;
  consultantName: string;
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
  invoiceId: string | null;
  netAmount: number;
  paid: number;
  balance: number;
}

/**
 * One row of the OPD Patient View (blueprint §7.1) — a *patient*, not a visit.
 *
 * The visit lists answer "what happened today"; this answers "how much has this
 * patient been through the clinic", which is why Total Recheckup lives here and
 * nowhere else: a follow-up on an existing visit adds a checkup, not a visit,
 * so a patient with one visit and four checkups is invisible to a visit count.
 */
export interface OpdPatientRow {
  /** The patient's id — this row *is* a patient, not an encounter. */
  id: string;
  patientNo: string;
  name: string;
  gender: string | null;
  phone: string | null;
  age: string;
  /** Distinct OPD visits (encounters), excluding soft-deleted ones. */
  totalVisits: number;
  /** Checkups across those visits — the blueprint's "Total Recheckup". */
  totalRecheckups: number;
  lastVisitDate: string | null;
  lastConsultantName: string | null;
}
