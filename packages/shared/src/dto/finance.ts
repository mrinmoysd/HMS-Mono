import { z } from 'zod';

export const ledgerEntrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  invoiceNo: z.string().trim().optional().or(z.literal('')),
  date: z.coerce.date(),
  headId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0),
  documentUrl: z.string().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
});
export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

export interface LedgerEntryDto {
  id: string;
  invoiceNo: string | null;
  name: string;
  date: string;
  headId: string | null;
  headName: string | null;
  amount: number;
  documentUrl: string | null;
  description: string | null;
  generatedByName: string | null;
  generatedByNo: string | null;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  net: number;
}
