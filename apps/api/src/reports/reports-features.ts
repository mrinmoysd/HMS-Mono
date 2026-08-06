import { Ability, REPORT_CATEGORIES } from '@smart-hospital/shared';
import type { RequiredFeature } from '../rbac/require-feature.decorator';

/**
 * Reports is the group where the module-level check was furthest from the
 * truth. `reports:view` was one switch over every report in the system, and
 * the spec gives each report its own feature with grants that differ by role
 * in exactly the way you would expect: Pathologist sees the Pathology Patient
 * Report, Radiologist the Radiology one, Payroll is Admin's alone.
 *
 * Every key in REPORT_CATEGORIES maps 1:1 onto a row in the spec's Reports
 * group. Reports without a builder yet are still mapped, so the catalogue and
 * the gate cannot drift as builders land.
 */
const REPORT_FEATURES: Record<string, string> = {
  'finance-daily': 'reports.all_transaction_report',
  'finance-income': 'reports.income_report',
  'finance-expense': 'reports.expense_report',
  'finance-patient-bill': 'reports.patient_bill_report',
  appointment: 'reports.appointment_report',
  opd: 'reports.opd_report',
  ipd: 'reports.ipd_report',
  ot: 'reports.ot_report',
  pharmacy: 'reports.pharmacy_bill_report',
  'medicine-expiry': 'reports.expiry_medicine_report',
  pathology: 'reports.pathology_patient_report',
  radiology: 'reports.radiology_patient_report',
  'blood-issue': 'reports.blood_issue_report',
  'component-issue': 'reports.component_issue_report',
  'blood-donor': 'reports.blood_donor_report',
  ambulance: 'reports.ambulance_report',
  birth: 'reports.birth_report',
  death: 'reports.death_report',
  payroll: 'reports.payroll_report',
  attendance: 'reports.staff_attendance_report',
  'inventory-stock': 'reports.inventory_stock_report',
  live: 'reports.live_consultation_report',
  audit: 'reports.audit_trail_report',
  patient: 'reports.patient_visit_report',
};

export const MAPPED_REPORTS = REPORT_FEATURES;

/** Which feature guards `GET /reports/:key`. Unknown key denies. */
export function reportFeature(key: string | undefined): RequiredFeature | null {
  if (!key) return null;
  const feature = REPORT_FEATURES[key];
  return feature ? { feature, action: 'view' } : null;
}

/**
 * The catalogue, filtered to what this user may actually run.
 *
 * Returning the full list and letting each report 403 would be the same
 * mistake the Billing module chips made: a menu of things that fail when
 * clicked. Categories left with no reports drop out entirely.
 */
export function visibleReportCategories(ability: Ability): typeof REPORT_CATEGORIES {
  return REPORT_CATEGORIES.map((c) => ({
    category: c.category,
    reports: c.reports.filter((r) => {
      const f = reportFeature(r.key);
      return f !== null && ability.canFeature(f.feature, 'view');
    }),
  })).filter((c) => c.reports.length > 0);
}
