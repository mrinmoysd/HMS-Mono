import { z } from 'zod';

/** Modules a referrer earns commission on (Add Person → Commission for Modules). */
export const REFERRAL_MODULES = [
  { key: 'opd', label: 'OPD' },
  { key: 'ipd', label: 'IPD' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'pathology', label: 'Pathology' },
  { key: 'radiology', label: 'Radiology' },
  { key: 'bloodBank', label: 'Blood Bank' },
  { key: 'ambulance', label: 'Ambulance' },
] as const;
export type ReferralModuleKey = (typeof REFERRAL_MODULES)[number]['key'];

export const referralCommissionsSchema = z.object({
  opd: z.coerce.number().min(0).max(100).default(0),
  ipd: z.coerce.number().min(0).max(100).default(0),
  pharmacy: z.coerce.number().min(0).max(100).default(0),
  pathology: z.coerce.number().min(0).max(100).default(0),
  radiology: z.coerce.number().min(0).max(100).default(0),
  bloodBank: z.coerce.number().min(0).max(100).default(0),
  ambulance: z.coerce.number().min(0).max(100).default(0),
});
export type ReferralCommissions = z.infer<typeof referralCommissionsSchema>;

export const referralPersonSchema = z.object({
  name: z.string().trim().min(1, 'Referrer name is required'),
  category: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  commissionPct: z.coerce.number().min(0).max(100).default(0),
  commissions: referralCommissionsSchema,
});
export type ReferralPersonInput = z.infer<typeof referralPersonSchema>;

/** Record a referral payout. commissionAmount is computed server-side. */
export const referralPaymentSchema = z.object({
  referralPersonId: z.string().uuid({ message: 'Payee is required' }),
  patientId: z.string().uuid().optional().nullable(),
  patientType: z.string().trim().optional().or(z.literal('')),
  patientName: z.string().trim().optional().or(z.literal('')),
  billNo: z.string().trim().optional().or(z.literal('')),
  billAmount: z.coerce.number().min(0),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  commissionAmount: z.coerce.number().min(0).optional(),
});
export type ReferralPaymentInput = z.infer<typeof referralPaymentSchema>;

export interface ReferralPersonDto {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
  commissionPct: number;
  commissions: ReferralCommissions;
}

export interface ReferralPaymentDto {
  id: string;
  referralPersonId: string;
  payeeName: string;
  patientId: string | null;
  patientType: string | null;
  patientName: string | null;
  billNo: string | null;
  billAmount: number;
  commissionPct: number;
  commissionAmount: number;
  createdAt: string;
}

/** Patient info + bills loaded when a patient is picked in Add Referral Payment. */
export interface ReferralPatientBill {
  invoiceId: string;
  billNo: string;
  module: string;
  netAmount: number;
}
export interface ReferralPatientDetailDto {
  id: string;
  name: string;
  patientNo: string;
  guardianName: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  age: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  remarks: string | null;
  tpaIdNo: string | null;
  tpaValidity: string | null;
  nationalId: string | null;
  bills: ReferralPatientBill[];
}
