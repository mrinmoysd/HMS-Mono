import { z } from 'zod';
import { listQuerySchema } from './common';

/** Simple name-only catalog (charge category/type, unit type, and many others). */
export const nameCatalogSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});
export type NameCatalogInput = z.infer<typeof nameCatalogSchema>;

export const taxCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  percent: z.coerce.number().min(0).max(100).default(0),
});
export type TaxCategoryInput = z.infer<typeof taxCategorySchema>;

/** Modules a Charge Type can be made visible in (demo's checkbox grid). */
export const CHARGE_MODULES = [
  'appointment',
  'opd',
  'ipd',
  'pathology',
  'radiology',
  'blood-bank',
  'ambulance',
] as const;
export type ChargeModule = (typeof CHARGE_MODULES)[number];

export const chargeTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  modules: z.array(z.enum(CHARGE_MODULES)).default([]),
});
export type ChargeTypeInput = z.infer<typeof chargeTypeSchema>;

export interface ChargeTypeDto {
  id: string;
  name: string;
  modules: ChargeModule[];
  createdAt: string;
}

/**
 * Listing charges for a module's picker.
 *
 * `module` is the whole point of the Charge Type visibility matrix: a charge
 * type ticked for Ambulance and nothing else must not be offerable on an OPD
 * bill. Without this filter the matrix is data nobody reads, and every screen
 * shows every charge in the branch.
 */
export const chargeListQuerySchema = listQuerySchema.extend({
  module: z.enum(CHARGE_MODULES).optional(),
  categoryId: z.string().uuid().optional(),
});
export type ChargeListQuery = z.infer<typeof chargeListQuerySchema>;

export const chargeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categoryId: z.string().uuid().optional().nullable(),
  typeId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  taxCategoryId: z.string().uuid().optional().nullable(),
  standardCharge: z.coerce.number().min(0).default(0),
});
export type ChargeInput = z.infer<typeof chargeSchema>;

export const chargeScheduleUpdateSchema = z.object({
  entries: z.array(
    z.object({
      tpaId: z.string().uuid(),
      amount: z.coerce.number().min(0),
    }),
  ),
});
export type ChargeScheduleUpdateInput = z.infer<typeof chargeScheduleUpdateSchema>;

export interface ChargeScheduleEntryDto {
  tpaId: string;
  tpaName: string;
  /** null = no override saved for this TPA yet (falls back to standardCharge). */
  amount: number | null;
}

export interface ChargeDetailDto extends ChargeDto {
  taxCategoryName: string | null;
  schedule: ChargeScheduleEntryDto[];
}

/** The catalog keys exposed by the generic masters endpoint. */
export const NAME_CATALOGS = [
  'charge-category',
  'unit-type',
  'floor',
  'bed-type',
  'medicine-category',
  'operation-category',
  'income-head',
  'expense-head',
  'department',
  'designation',
  'specialization',
  'finding-category',
  'symptom-head',
  'icd-group',
  'front-office-purpose',
  'complaint-type',
  'content-type',
  'item-category',
  'item-store',
  'pharma-company',
  'medicine-group',
  'pharma-unit',
  'dosage-interval',
  'dosage-duration',
  'referral-category',
] as const;
export type NameCatalogKey = (typeof NAME_CATALOGS)[number];

export interface CatalogItemDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface TaxCategoryDto extends CatalogItemDto {
  percent: number;
}

export interface ChargeDto {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  typeId: string | null;
  typeName: string | null;
  unitId: string | null;
  unitName: string | null;
  taxCategoryId: string | null;
  taxPercent: number;
  standardCharge: number;
  createdAt: string;
}
