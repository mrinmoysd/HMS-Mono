import { z } from 'zod';

/** The 19 report categories (FRD §2.28), each expanding to report screens. */
export const REPORT_CATEGORIES: { category: string; reports: { key: string; label: string }[] }[] = [
  {
    category: 'Finance',
    reports: [
      { key: 'finance-daily', label: 'Daily Transaction' },
      { key: 'finance-income', label: 'Income' },
      { key: 'finance-expense', label: 'Expense' },
      { key: 'finance-patient-bill', label: 'Patient Bill' },
    ],
  },
  { category: 'Appointment', reports: [{ key: 'appointment', label: 'Appointment Report' }] },
  { category: 'OPD', reports: [{ key: 'opd', label: 'OPD Report' }] },
  { category: 'IPD', reports: [{ key: 'ipd', label: 'IPD Report' }] },
  { category: 'OT', reports: [{ key: 'ot', label: 'OT Report' }] },
  {
    category: 'Pharmacy',
    reports: [
      { key: 'pharmacy', label: 'Pharmacy Bill Report' },
      { key: 'medicine-expiry', label: 'Medicine Expiry Report' },
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
      { key: 'attendance', label: 'Staff Attendance Report' },
    ],
  },
  { category: 'Inventory', reports: [{ key: 'inventory-stock', label: 'Inventory Stock Report' }] },
  { category: 'Live Consultation', reports: [{ key: 'live', label: 'Live Consultation Report' }] },
  { category: 'Log', reports: [{ key: 'audit', label: 'Audit Trail Report' }] },
  { category: 'Patient', reports: [{ key: 'patient', label: 'Patient Visit Report' }] },
];

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
