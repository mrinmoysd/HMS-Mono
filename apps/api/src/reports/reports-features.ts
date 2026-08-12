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
  'balance-amount': 'reports.balance_amount_report',
  'opd-balance': 'reports.opd_balance_report',
  'ipd-balance': 'reports.ipd_balance_report',
  'pathology-balance': 'reports.pathology_balance_report',
  'radiology-balance': 'reports.radiology_balance_report',
  'processing-transaction': 'reports.processing_transaction_report',
  'discharge-patient': 'reports.discharge_patient_report',
  'income-group': 'reports.income_group_report',
  'expense-group': 'reports.expense_group_report',
  referral: 'reports.referral_report',
  'inventory-item': 'reports.inventory_item_report',
  'inventory-issue': 'reports.inventory_issue_report',
  stock: 'reports.stock_report',
  'medicine-purchase': 'reports.medicine_purchase_report',
  'payroll-month': 'reports.payroll_month_report',
  'staff-day-wise-attendance': 'reports.staff_day_wise_attendance_report',
  'patient-credential': 'reports.patient_login_credential',
  'user-log': 'reports.user_log',
  'email-sms-log': 'reports.email_sms_log',
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
  // Its own page (`/reports/tpa`, served by GET /tpas/report) rather than a
  // builder, but a catalogue row like any other so the same permission decides
  // whether it appears.
  tpa: 'reports.tpa_report',
};

export const MAPPED_REPORTS = REPORT_FEATURES;

/**
 * Reference reports we deliberately do not offer, and why.
 *
 * Listed rather than left missing so the count reconciles: every report
 * feature in the spec is either served by a catalogue entry or named here.
 * `reports.spec.ts` fails if a feature falls through both, which is what stops
 * this drifting into "we think we built most of them".
 */
export const UNMAPPED_REPORT_FEATURES: Record<string, string> = {
  // The spec lists Payroll Report twice, as separate feature rows with
  // identical labels. One report, one menu entry — a second identical row
  // would be a bug that happened to match the reference.
  'reports.payroll_report_2': 'Duplicate of reports.payroll_report in the spec.',

  // Both of these need an entity that does not exist, and a way to create the
  // data. A report over a table nothing writes is an empty screen that reads
  // as broken — the same reason this codebase refuses inert settings.
  'reports.medicine_purchase_return_report':
    'No purchase-return concept in the schema. Needs a MedicinePurchaseReturn model and a UI to record returns before a report means anything.',
  'reports.live_meeting_report':
    'The spec separates Live Consultation (with a patient) from Live Meeting (staff to staff). We model only LiveConsultation, so this is a feature rather than a report.',
};

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
