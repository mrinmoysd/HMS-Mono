import { z } from 'zod';

export const MODALITIES = ['pathology', 'radiology'] as const;
export type Modality = (typeof MODALITIES)[number];

export const diagnosticTestParameterSchema = z.object({
  parameterName: z.string().trim().min(1, 'Parameter name is required'),
  referenceRange: z.string().trim().optional().or(z.literal('')),
  unit: z.string().trim().optional().or(z.literal('')),
});
export type DiagnosticTestParameterInput = z.infer<typeof diagnosticTestParameterSchema>;

export interface DiagnosticTestParameterDto {
  id: string;
  parameterName: string;
  referenceRange: string | null;
  unit: string | null;
}

export const diagnosticTestSchema = z.object({
  modality: z.enum(MODALITIES),
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Name is required'),
  shortName: z.string().trim().optional().or(z.literal('')),
  testType: z.string().trim().optional().or(z.literal('')),
  subCategory: z.string().trim().optional().or(z.literal('')),
  method: z.string().trim().optional().or(z.literal('')),
  reportDays: z.coerce.number().int().min(0).default(1),
  chargeId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  referenceRange: z.string().trim().optional().or(z.literal('')),
  refMin: z.coerce.number().optional().nullable(),
  refMax: z.coerce.number().optional().nullable(),
  description: z.string().trim().optional().or(z.literal('')),
  charge: z.coerce.number().min(0).default(0),
  parameters: z.array(diagnosticTestParameterSchema).default([]),
});
export type DiagnosticTestInput = z.infer<typeof diagnosticTestSchema>;

export interface DiagnosticTestDto {
  id: string;
  modality: string;
  name: string;
  shortName: string | null;
  testType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subCategory: string | null;
  method: string | null;
  reportDays: number;
  chargeId: string | null;
  chargeName: string | null;
  chargeCategoryName: string | null;
  taxPercent: number;
  taxCategoryName: string | null;
  standardCharge: number;
  unitId: string | null;
  unitName: string | null;
  referenceRange: string | null;
  refMin: number | null;
  refMax: number | null;
  description: string | null;
  charge: number;
  parameters: DiagnosticTestParameterDto[];
}

/** Modality-scoped catalog: Setup → Pathology/Radiology → Category. */
export const diagnosticCategorySchema = z.object({
  modality: z.enum(MODALITIES),
  name: z.string().trim().min(1, 'Name is required'),
});
export type DiagnosticCategoryInput = z.infer<typeof diagnosticCategorySchema>;

export interface DiagnosticCategoryDto {
  id: string;
  modality: string;
  name: string;
  createdAt: string;
}

/** Modality-scoped catalog: Setup → Pathology/Radiology → Unit. */
export const diagnosticUnitSchema = z.object({
  modality: z.enum(MODALITIES),
  name: z.string().trim().min(1, 'Name is required'),
});
export type DiagnosticUnitInput = z.infer<typeof diagnosticUnitSchema>;

export interface DiagnosticUnitDto {
  id: string;
  modality: string;
  name: string;
  createdAt: string;
}

/** Generate a pathology/radiology bill from selected tests → invoice. */
export const diagnosticBillSchema = z.object({
  modality: z.enum(MODALITIES),
  patientId: z.string().uuid({ message: 'Patient is required' }),
  consultantId: z.string().uuid().optional().nullable(),
  referenceDoctor: z.string().trim().optional().or(z.literal('')),
  prescriptionNo: z.string().trim().optional().or(z.literal('')),
  applyTpa: z.boolean().optional().default(false),
  note: z.string().trim().optional().or(z.literal('')),
  previousReportValue: z.string().trim().optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        testId: z.string().uuid().optional().nullable(),
        name: z.string().min(1),
        reportDays: z.coerce.number().int().min(0).optional(),
        reportDate: z.coerce.date().optional().nullable(),
        appliedCharge: z.coerce.number().min(0),
        qty: z.coerce.number().int().min(1).default(1),
        discountPct: z.coerce.number().min(0).max(100).default(0),
        taxPct: z.coerce.number().min(0).max(100).default(0),
        resultValue: z.string().trim().optional(),
      }),
    )
    .min(1, 'Add at least one test'),
  payment: z
    .object({ amount: z.coerce.number().min(0).default(0), mode: z.string().default('cash') })
    .optional(),
});
export type DiagnosticBillInput = z.infer<typeof diagnosticBillSchema>;

/**
 * Editable fields on an existing Pathology/Radiology bill.
 *
 * Deliberately excludes `items`. Each bill line has a matching LabInvestigation
 * row carrying reportValue, status, approvedById and approvedAt — replacing the
 * lines on save would silently destroy recorded and approved results. Tests are
 * added or removed by raising a new bill, not by editing this one.
 */
export const diagnosticBillUpdateSchema = z.object({
  consultantId: z.string().uuid().optional().nullable(),
  referenceDoctor: z.string().trim().optional().or(z.literal('')),
  prescriptionNo: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().optional().or(z.literal('')),
  previousReportValue: z.string().trim().optional().or(z.literal('')),
  /** Bill-level discount; totals are recomputed server-side from the subtotal. */
  discountPct: z.coerce.number().min(0).max(100).optional(),
});
export type DiagnosticBillUpdateInput = z.infer<typeof diagnosticBillUpdateSchema>;

/**
 * Header strip values for a Generate Bill form: the bill number that would be
 * issued next (a preview — it is not reserved) and, when a patient is given,
 * the case the bill would be filed under. Both mirror exactly what
 * `generateBill` will do, so the strip does not lie about the saved record.
 */
export interface NextBillNoDto {
  billNo: string;
  caseNo: string | null;
}

/** "Previous Report Value" history row (Pathology Generate Bill + Bill Details). */
export interface PreviousReportRow {
  id: string;
  testName: string;
  sampleCollected: string | null;
  reportDate: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  tax: number | null;
  netAmount: number | null;
  status: string;
}
