import { z } from 'zod';

/** Add/Edit Branch — simplified to Name + URL; `code` is auto-generated server-side. */
export const branchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z.string().url().optional().or(z.literal('')),
});
export type BranchInput = z.infer<typeof branchSchema>;
export const branchUpdateSchema = branchSchema.partial();
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;

export interface BranchDto {
  id: string;
  name: string;
  code: string;
  url: string | null;
  isHome: boolean;
}

/** One branch's value for every column in a Multi-Branch overview section. */
export interface BranchOverviewRow {
  branchId: string;
  branchName: string;
  isHome: boolean;
  values: Record<string, number>;
}

/** A single Overview table (+ pie chart) — e.g. "Appointment", "OPD - Out Patient". */
export interface BranchOverviewSection {
  key: string;
  title: string;
  columns: { key: string; label: string }[];
  /** Which column's values drive the per-branch pie chart slices. */
  pieMetric: string;
  rows: BranchOverviewRow[];
}

export interface BranchOverviewDto {
  sections: BranchOverviewSection[];
}
