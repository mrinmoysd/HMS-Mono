import { z } from 'zod';
import { BLOOD_GROUPS, GENDERS } from './patient';

/** Legacy flat product/rate catalog — still used by Setup → Blood Bank masters. */
export const bloodProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal('')),
  component: z.string().trim().optional().or(z.literal('')),
  rate: z.coerce.number().min(0).default(0),
});
export type BloodProductInput = z.infer<typeof bloodProductSchema>;

export interface BloodProductDto {
  id: string;
  name: string;
  bloodGroup: string | null;
  component: string | null;
  rate: number;
  units: number;
}

export const bloodDonorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  bloodGroup: z.enum(BLOOD_GROUPS),
  gender: z.enum(GENDERS).optional(),
  dob: z.coerce.date().optional(),
  age: z.string().trim().optional().or(z.literal('')),
  fatherName: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  lastDonation: z.coerce.date().optional(),
});
export type BloodDonorInput = z.infer<typeof bloodDonorSchema>;

export interface BloodDonorDto {
  id: string;
  name: string;
  bloodGroup: string;
  gender: string | null;
  dob: string | null;
  age: string | null;
  fatherName: string | null;
  phone: string | null;
  address: string | null;
  lastDonation: string | null;
  createdAt: string;
}

/** Add a whole-blood bag from a donor — creates the bag + a donation bill/payment via the invoice engine. */
export const bloodBagSchema = z.object({
  donorId: z.string().uuid({ message: 'Donor is required' }),
  bagNo: z.string().trim().min(1, 'Bag No is required'),
  donateDate: z.coerce.date().optional(),
  volume: z.string().trim().optional().or(z.literal('')),
  unitType: z.string().trim().optional().or(z.literal('')),
  lot: z.string().trim().optional().or(z.literal('')),
  institution: z.string().trim().optional().or(z.literal('')),
  chargeId: z.string().uuid({ message: 'Charge is required' }),
  standardCharge: z.coerce.number().min(0).default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
  note: z.string().trim().optional().or(z.literal('')),
  payment: z
    .object({ amount: z.coerce.number().min(0).default(0), mode: z.string().default('cash') })
    .optional(),
});
export type BloodBagInput = z.infer<typeof bloodBagSchema>;

export interface BloodBagDto {
  id: string;
  donorId: string | null;
  donorName: string | null;
  bagNo: string;
  bloodGroup: string;
  component: string | null;
  volume: string | null;
  unitType: string | null;
  lot: string | null;
  institution: string | null;
  donateDate: string | null;
  chargeId: string | null;
  chargeName: string | null;
  standardCharge: number;
  discountPct: number;
  taxPct: number;
  netAmount: number;
  paidAmount: number;
  paymentMode: string | null;
  note: string | null;
  status: string;
  sourceBagId: string | null;
  createdAt: string;
}

export const bloodComponentItemSchema = z.object({
  component: z.string().trim().min(1, 'Component name is required'),
  bagNo: z.string().trim().min(1, 'Bag No is required'),
  volume: z.string().trim().optional().or(z.literal('')),
  unitType: z.string().trim().optional().or(z.literal('')),
  lot: z.string().trim().optional().or(z.literal('')),
  institution: z.string().trim().optional().or(z.literal('')),
});
export type BloodComponentItemInput = z.infer<typeof bloodComponentItemSchema>;

/** Split a whole-blood bag into one or more component bags. No separate charge/payment. */
export const bloodComponentSplitSchema = z.object({
  bagId: z.string().uuid({ message: 'Bag is required' }),
  items: z.array(bloodComponentItemSchema).min(1, 'Add at least one component'),
});
export type BloodComponentSplitInput = z.infer<typeof bloodComponentSplitSchema>;

/** Issue a whole-blood bag or a component bag to a patient → invoice + bag marked issued. */
export const bloodIssueSchema = z.object({
  type: z.enum(['blood', 'component']).default('blood'),
  patientId: z.string().uuid({ message: 'Patient is required' }),
  bagId: z.string().uuid({ message: 'Bag is required' }),
  consultantId: z.string().uuid().optional().nullable(),
  referenceDoctor: z.string().trim().optional().or(z.literal('')),
  technician: z.string().trim().optional().or(z.literal('')),
  chargeId: z.string().uuid().optional().nullable(),
  standardCharge: z.coerce.number().min(0).default(0),
  appliedCharge: z.coerce.number().min(0),
  bloodQty: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
  applyTpa: z.boolean().optional(),
  payment: z
    .object({ amount: z.coerce.number().min(0).default(0), mode: z.string().default('cash') })
    .optional(),
});
export type BloodIssueInput = z.infer<typeof bloodIssueSchema>;

export interface BloodIssueDto {
  id: string;
  invoiceId: string;
  billNo: string;
  caseNo: string | null;
  type: string;
  issueDate: string;
  patientId: string;
  patientName: string;
  patientGender: string | null;
  patientAge: string | null;
  bagId: string | null;
  bagNo: string | null;
  bloodGroup: string | null;
  component: string | null;
  donorName: string | null;
  consultantId: string | null;
  consultantName: string | null;
  referenceDoctor: string | null;
  technician: string | null;
  note: string | null;
  bloodQty: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  netAmount: number;
  paid: number;
  balance: number;
  createdByName: string | null;
}

/**
 * Edit an existing Blood/Component Issue.
 *
 * Scope is the issue's header plus its bill-level discount — deliberately not
 * the bag. The bag was marked `issued` when this record was created and may
 * since have been split, discarded or re-counted; swapping it here would have
 * to unwind that, and a mis-click would silently return a transfused bag to
 * stock. Issuing a different bag means voiding this issue and raising a new
 * one, which is also what leaves an audit trail.
 */
export const bloodIssueUpdateSchema = z.object({
  consultantId: z.string().uuid().optional().nullable(),
  referenceDoctor: z.string().trim().optional().or(z.literal('')),
  technician: z.string().trim().optional().or(z.literal('')),
  bloodQty: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  discountPct: z.coerce.number().min(0).max(100).optional(),
});
export type BloodIssueUpdateInput = z.infer<typeof bloodIssueUpdateSchema>;

/**
 * Header strip values for the Issue form: the bill number that would be issued
 * next (a preview — not reserved) and, when a patient is given, the case the
 * issue would be filed under. Both mirror what `issue()` actually does.
 */
export interface BloodIssueNextNoDto {
  billNo: string;
  caseNo: string | null;
}
