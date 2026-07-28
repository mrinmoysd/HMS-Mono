import { z } from 'zod';

/** Entities that can carry custom fields (FRD §2.29.2 — "Belongs To" of 22). */
export const CUSTOM_FIELD_ENTITIES = [
  'patient',
  'appointment',
  'opd',
  'ipd',
  'pharmacy',
  'pathology',
  'radiology',
  'staff',
  'blood_bank',
  'ambulance',
  'birth',
  'death',
  'income',
  'expense',
  'inventory',
  'front_office',
  'referral',
  'tpa',
  'operation',
  'bed',
  'live_consultation',
  'notification',
] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'datetime',
  'select',
  'multiselect',
  'checkbox',
  'color',
  'hyperlink',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const customFieldSchema = z.object({
  entity: z.enum(CUSTOM_FIELD_ENTITIES),
  label: z.string().trim().min(1, 'Label is required'),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  options: z.array(z.string()).default([]),
  gridWidth: z.coerce.number().int().min(1).max(12).default(6),
  required: z.boolean().default(false),
  visibleTable: z.boolean().default(false),
  visiblePrint: z.boolean().default(false),
  visibleReport: z.boolean().default(false),
  visiblePatientPanel: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});
export type CustomFieldInput = z.infer<typeof customFieldSchema>;

export interface CustomFieldDto {
  id: string;
  entity: string;
  label: string;
  key: string;
  fieldType: CustomFieldType;
  options: string[];
  gridWidth: number;
  required: boolean;
  visibleTable: boolean;
  visiblePrint: boolean;
  visibleReport: boolean;
  visiblePatientPanel: boolean;
  sortOrder: number;
}
