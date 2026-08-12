import { z } from 'zod';

/**
 * One report in the catalogue.
 *
 * Most reports are tabular and run through the generic engine: the server
 * returns `{columns, rows, summary}` and the Reports page renders it. A few
 * need a screen of their own — TPA has filters and a layout no generic table
 * covers — and those carry an `href` instead of a builder.
 *
 * The distinction lives here, in the catalogue, so that a bespoke report is
 * still a normal row: filtered by the same permission check as every other,
 * rather than hardcoded into the page and shown to everyone.
 */
export interface ReportEntry {
  key: string;
  label: string;
  /** Set when the report has its own page rather than a generic builder. */
  href?: string;
}

/** The 19 report categories (FRD §2.28), each expanding to report screens. */
export const REPORT_CATEGORIES: { category: string; reports: ReportEntry[] }[] = [
  {
    category: 'Finance',
    reports: [
      { key: 'finance-daily', label: 'Daily Transaction' },
      { key: 'finance-income', label: 'Income' },
      { key: 'finance-expense', label: 'Expense' },
      { key: 'finance-patient-bill', label: 'Patient Bill' },
      { key: 'income-group', label: 'Income Group' },
      { key: 'expense-group', label: 'Expense Group' },
    ],
  },
  { category: 'Referral', reports: [{ key: 'referral', label: 'Referral Report' }] },
  {
    category: 'Balance',
    reports: [
      { key: 'balance-amount', label: 'Balance Amount Report' },
      { key: 'opd-balance', label: 'OPD Balance Report' },
      { key: 'ipd-balance', label: 'IPD Balance Report' },
      { key: 'pathology-balance', label: 'Pathology Balance Report' },
      { key: 'radiology-balance', label: 'Radiology Balance Report' },
      { key: 'processing-transaction', label: 'Processing Transaction Report' },
    ],
  },
  { category: 'Appointment', reports: [{ key: 'appointment', label: 'Appointment Report' }] },
  { category: 'OPD', reports: [{ key: 'opd', label: 'OPD Report' }] },
  {
    category: 'IPD',
    reports: [
      { key: 'ipd', label: 'IPD Report' },
      { key: 'discharge-patient', label: 'Discharge Patient Report' },
    ],
  },
  { category: 'OT', reports: [{ key: 'ot', label: 'OT Report' }] },
  {
    category: 'Pharmacy',
    reports: [
      { key: 'pharmacy', label: 'Pharmacy Bill Report' },
      { key: 'medicine-expiry', label: 'Medicine Expiry Report' },
      { key: 'stock', label: 'Stock Report' },
      { key: 'medicine-purchase', label: 'Medicine Purchase Report' },
    ],
  },
  { category: 'Pathology', reports: [{ key: 'pathology', label: 'Pathology Report' }] },
  { category: 'Radiology', reports: [{ key: 'radiology', label: 'Radiology Report' }] },
  {
    category: 'Blood Bank',
    reports: [
      { key: 'blood-issue', label: 'Blood Issue Report' },
      { key: 'component-issue', label: 'Component Issue Report' },
      { key: 'blood-donor', label: 'Blood Donor Report' },
    ],
  },
  { category: 'Ambulance', reports: [{ key: 'ambulance', label: 'Ambulance Report' }] },
  {
    category: 'Birth Death',
    reports: [
      { key: 'birth', label: 'Birth Report' },
      { key: 'death', label: 'Death Report' },
    ],
  },
  {
    category: 'Human Resource',
    reports: [
      { key: 'payroll', label: 'Payroll Report' },
      { key: 'payroll-month', label: 'Payroll Month Report' },
      { key: 'attendance', label: 'Staff Attendance Report' },
      { key: 'staff-day-wise-attendance', label: 'Staff Day Wise Attendance Report' },
    ],
  },
  {
    category: 'Inventory',
    reports: [
      { key: 'inventory-stock', label: 'Inventory Stock Report' },
      { key: 'inventory-item', label: 'Inventory Item Report' },
      { key: 'inventory-issue', label: 'Inventory Issue Report' },
    ],
  },
  { category: 'Live Consultation', reports: [{ key: 'live', label: 'Live Consultation Report' }] },
  {
    category: 'Log',
    reports: [
      { key: 'audit', label: 'Audit Trail Report' },
      { key: 'user-log', label: 'User Log' },
      { key: 'email-sms-log', label: 'Email / SMS Log' },
    ],
  },
  {
    category: 'Patient',
    reports: [
      { key: 'patient', label: 'Patient Visit Report' },
      { key: 'patient-credential', label: 'Patient Login Credential' },
    ],
  },
  { category: 'TPA', reports: [{ key: 'tpa', label: 'TPA Report', href: '/reports/tpa' }] },
];

/** Reports the generic engine must have a builder for. */
export const BUILDER_REPORT_KEYS = REPORT_CATEGORIES.flatMap((c) =>
  c.reports.filter((r) => !r.href).map((r) => r.key),
);

export const ALL_REPORT_KEYS = REPORT_CATEGORIES.flatMap((c) => c.reports.map((r) => r.key));

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export interface ReportResult {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: Record<string, number>;
}
