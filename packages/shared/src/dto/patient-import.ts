import { z } from 'zod';
import { patientSchema } from './patient';

/** Bulk patient import (FRD §2.1 "Import Patient"). Rows are validated per-row
 *  server-side; invalid rows are reported back, valid rows inserted. */
export const patientImportSchema = z.object({
  rows: z.array(patientSchema.partial({ age: true }).extend({
    name: z.string().trim().min(1),
    age: z.string().trim().optional().default('0-0-0'),
  })).min(1, 'No rows to import').max(5000),
});
export type PatientImportInput = z.infer<typeof patientImportSchema>;

export interface PatientImportResult {
  inserted: number;
  failed: { row: number; reason: string }[];
}
