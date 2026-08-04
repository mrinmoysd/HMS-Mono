import type { ModuleKey } from './modules';
import type { ActionKey, RoleKey } from './roles';

/**
 * Feature-level permission model — the 36 groups / 332 features / 751 toggles
 * transcribed from docs/ROLE_PERMISSION_PARITY.md §6.
 *
 * Why this exists: the module × action matrix in roles.ts has 116 atoms, so
 * `opd:view` is one switch for all 22 OPD features. That cannot express "a
 * nurse may write nurse notes but may not register a patient", which is exactly
 * what the spec grants. Features are the real unit of authorisation; modules
 * remain as the *grouping* layer and are derived from these rows.
 *
 * ── Reading the grant strings ────────────────────────────────────────────────
 * Each feature carries one hex digit per role, in this fixed order:
 *
 *     Admin  Accountant  Doctor  Pharmacist  Pathologist  Radiologist  Receptionist  Nurse
 *
 * Bits: 1 = view, 2 = add, 4 = edit, 8 = delete. So `f` is full CRUD, `7` is
 * view+add+edit, `b` is view+add+delete, `5` is view+edit, `a` is add+delete.
 *
 * §1 says 331 of the 332 rows expose a view toggle. The row it names as the
 * exception — Apply Leave — is not the one: its string is `bbbbbbbb`, and
 * `b` includes the view bit. The row actually missing view is Staff Timeline,
 * `aaa00000`, where `a` is add+delete only. The prose is wrong; the hex is
 * right, and §5's Human Resource counts (12 view-capable, Nurse 2 = Staff +
 * Apply Leave) confirm it. Trust the digits.
 *
 * super_admin and patient are deliberately absent from these strings.
 * super_admin holds everything; patient is a portal role of ours with no
 * counterpart in the reference, and keeps its grants in roles.ts.
 *
 * The strings are kept verbatim and in spec order so this file can be diffed by
 * eye against §6. Do not "tidy" the ordering — the checksum test in
 * features.test.ts asserts the §5 per-role counts, and reordering hides which
 * row a failure belongs to.
 */

/** Digit order inside every grant string. Changing this invalidates all of them. */
export const GRANT_ROLE_ORDER = [
  'admin',
  'accountant',
  'doctor',
  'pharmacist',
  'pathologist',
  'radiologist',
  'receptionist',
  'nurse',
] as const satisfies readonly RoleKey[];

export type GrantRole = (typeof GRANT_ROLE_ORDER)[number];

/** Bit values, matching the reference's can_view/can_add/can_edit/can_delete. */
export const ACTION_BITS: Record<ActionKey, number> = { view: 1, add: 2, edit: 4, delete: 8 };

/** Low bit first, so derived action lists always read view → add → edit → delete. */
const ACTION_ORDER: readonly ActionKey[] = ['view', 'add', 'edit', 'delete'];

/**
 * A row as written below: [label, grants], optionally with `hidesView`.
 *
 * A feature does NOT expose all four toggles — it exposes exactly the toggles
 * Admin holds. That is not a guess: summing Admin's set bits over all 332 rows
 * gives 751, the spec's checkbox count, and so does the union across all eight
 * roles. The two agreeing means no role holds a toggle Admin lacks, which is
 * also a strong check on this transcription. If all four were always rendered
 * the total would be 1326.
 */
type Row = readonly [label: string, grants: string];

export interface FeatureDef {
  /** Stable id, `group.slug_of_label`. */
  key: string;
  group: FeatureGroupKey;
  label: string;
  /** The toggles this feature exposes — the bits Admin holds. Sums to 751. */
  actions: readonly ActionKey[];
  /** Per-role bitmask, indexed by GRANT_ROLE_ORDER. */
  grants: readonly number[];
}

export interface FeatureGroupDef {
  key: FeatureGroupKey;
  label: string;
  /**
   * The module this group hangs under, for the sidebar and for deriving the
   * legacy module-level keys. `null` where we have no module yet — those are
   * the five absences recorded in the parity doc, Part II §D.
   */
  module: ModuleKey | null;
  features: FeatureDef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// The table. Transcribed from §6; group order and row order follow the spec.
// ─────────────────────────────────────────────────────────────────────────────

const TABLE: Record<string, { label: string; module: ModuleKey | null; rows: readonly Row[] }> = {
  dashboard: {
    label: 'Dashboard and Widgets',
    module: 'dashboard',
    rows: [
      ['Staff Role Count Widget', '11110111'],
      ['Total Revenue', '11100010'],
      ['Bed Occupancy', '11000010'],
      ['Medicines Stock', '11010010'],
      ["Today's Appointments", '11001010'],
      ['Outstanding Bills', '11000100'],
      ['Blood Bank', '11000000'],
      ['Recent Activity', '11000010'],
      ['Yearly Income & Expense Chart', '11000000'],
      ['Monthly Income Overview', '11000000'],
      ['Notification Center', '11111111'],
      ['Income by Module', '11000000'],
    ],
  },

  billing: {
    label: 'Billing',
    module: 'billing',
    rows: [
      ['OPD Billing', '11100010'],
      ['OPD Billing Payment', '33300000'],
      ['IPD Billing', '11100010'],
      ['IPD Billing Payment', '33300000'],
      ['Pharmacy Billing', '11110010'],
      ['Pharmacy Billing Payment', '33130000'],
      ['Pathology Billing', '11101010'],
      ['Pathology Billing Payment', '33103000'],
      ['Radiology Billing', '11100110'],
      ['Radiology Billing Payment', '33100300'],
      ['Blood Bank Billing', '11100010'],
      ['Blood Bank Billing Payment', '33100000'],
      ['Ambulance Billing', '11100010'],
      ['Ambulance Billing Payment', '33300000'],
      ['Generate Bill', '11100000'],
      ['Generate Discharge Card', '11100000'],
      ['Appointment Billing', '10100000'],
      ['Payment Receipt Header Footer', '10000000'],
    ],
  },

  appointment: {
    label: 'Appointment',
    module: 'appointment',
    rows: [
      ['Slot', 'fff000f0'],
      ['Doctor Shift', '55500050'],
      ['Shift', 'fff000f0'],
      ['Doctor Wise Appointment', '11100010'],
      ['Patient Queue', '11100010'],
      ['Appointment', 'b0b000b0'],
      ['Reschedule', '10100010'],
      ['Print Appointment Header Footer', '10000010'],
      ['Appointment Priority', 'f00000f0'],
    ],
  },

  opd: {
    label: 'OPD',
    module: 'opd',
    rows: [
      ['OPD Patient', 'f7f111f1'],
      ['Prescription', 'f0f00001'],
      ['Visit', 'f7f001f1'],
      ['OPD Timeline', 'f0f0000f'],
      ['OPD Prescription Print Header Footer', '10100000'],
      ['Move Patient in IPD', '10100011'],
      ['Manual Prescription', '10100011'],
      ['Charges', 'fff000f0'],
      ['Payment', 'fbb000b0'],
      ['OPD Medication', 'f1f0000f'],
      ['Operation Theatre', 'f1f00001'],
      ['Lab Investigation', '11101111'],
      ['Patient Discharge', '55500051'],
      ['Patient Discharge Revert', '10100010'],
      ['Treatment History', '11101011'],
      ['Checkup', 'f1f001f1'],
      ['Print Bill', '11100010'],
      ['Live Consult', '11100001'],
      ['OPD Vitals', 'f0000000'],
      ['Antenatal', 'f0000000'],
      ['OPD Antenatal Finding Print Header Footer', '10000000'],
      ['OPD Bill Print Header Footer', '50000000'],
    ],
  },

  ipd: {
    label: 'IPD',
    module: 'ipd',
    rows: [
      ['IPD Patients', 'f7f111f1'],
      ['Discharged Patients', 'f7f011f1'],
      ['Consultant Register', 'f0f0000f'],
      ['IPD Timeline', 'f0f0000f'],
      ['Charges', 'fff000f0'],
      ['Payment', 'fbb000b0'],
      ['Bed', 'f0f000f1'],
      ['IPD Prescription Print Header Footer', '11100000'],
      ['Bed Status', '11100011'],
      ['Prescription', 'f0f00001'],
      ['IPD Bill Print Header Footer', '11100000'],
      ['IPD Medication', 'fff0000f'],
      ['Bed History', '11100011'],
      ['Lab Investigation', '11101101'],
      ['Patient Discharge', '51500151'],
      ['Patient Discharge Revert', '11100010'],
      ['Nurse Note', 'f0f0000f'],
      ['Bed Type', 'fff00000'],
      ['Bed Group', 'fff00000'],
      ['Floor', 'fff00000'],
      ['Operation Theatre', 'f1f00011'],
      ['Live Consult', '11100001'],
      ['Treatment History', '11101111'],
      ['IPD Vitals', 'f0000000'],
      ['Previous Obstetric History', 'f0000000'],
      ['Postnatal History', 'f0000000'],
      ['Antenatal', 'f0000000'],
      ['IPD Antenatal Finding Print Header Footer', '10000000'],
      ['Discharge Summary Print Header Footer', '10000000'],
      ['IPD Obstetric History Print Header Footer', '10000000'],
    ],
  },

  pharmacy: {
    label: 'Pharmacy',
    module: 'pharmacy',
    rows: [
      ['Medicine', 'f11f0010'],
      ['Pharmacy Bill', 'f10f0010'],
      ['Medicine Category', 'f00f0000'],
      ['Medicine Bad Stock', 'b10b0010'],
      ['Pharmacy Bill print Header Footer', '10010000'],
      ['Import Medicine', '10010000'],
      ['Medicine Purchase', 'b10b0010'],
      ['Medicine Supplier', 'f01f0000'],
      ['Medicine Dosage', 'f00f0000'],
      ['Dosage Interval', 'f31f0000'],
      ['Dosage Duration', 'f31f0000'],
      ['Partial Payment', 'b30b0000'],
      ['Unit', 'f0000000'],
      ['Company', 'f0000000'],
      ['Medicine Group', 'f0000000'],
    ],
  },

  pathology: {
    label: 'Pathology',
    module: 'pathology',
    rows: [
      ['Pathology Test', 'f110f010'],
      ['Pathology Category', 'f000f000'],
      ['Print Header Footer', '10001000'],
      ['Pathology Bill', 'f010f010'],
      ['Pathology Unit', 'f000f000'],
      ['Pathology Parameter', 'f000f000'],
      ['Add/Edit Collection Person', '55105000'],
      ['Partial Payment', 'bb00b000'],
      ['Add/Edit Report', '55105000'],
    ],
  },

  radiology: {
    label: 'Radiology',
    module: 'radiology',
    rows: [
      ['Radiology Test', 'f1100f10'],
      ['Radiology Bill', 'f1100f10'],
      ['Radiology Category', 'f0000f00'],
      ['Print Header Footer', '10100100'],
      ['Radiology Unit', 'f0000f00'],
      ['Radiology Parameter', 'f0000f00'],
      ['Partial Payment', 'bb000b00'],
      ['Add/Edit Collection Person', '55100500'],
      ['Add/Edit Report', '50100500'],
    ],
  },

  blood_bank: {
    label: 'Blood Bank',
    module: 'blood_bank',
    rows: [
      ['Blood Issue', 'f130f010'],
      ['Blood Donor', 'f000f010'],
      ['Blood Stock', 'b111b010'],
      ['Print Header Footer', '10101000'],
      ['Blood Bank Product', 'f100f000'],
      ['Blood Bank Components', 'b110b010'],
      ['Issue Component', 'f110f010'],
      ['Partial Payment', 'bb00b000'],
    ],
  },

  ambulance: {
    label: 'Ambulance',
    module: 'ambulance',
    rows: [
      ['Ambulance Call', 'f11000f0'],
      ['Ambulance', 'f11000f0'],
      ['Print Header Footer', '11000010'],
      ['Partial Payment', 'bb0000b0'],
    ],
  },

  front_office: {
    label: 'Front Office',
    module: 'front_office',
    rows: [
      ['Visitor Book', 'f00000f0'],
      ['Phone Call Log', 'f00000f0'],
      ['Postal Dispatch', 'f00000f0'],
      ['Postal Receive', 'f00000f0'],
      ['Complain', 'f00000f0'],
      ['Setup Front Office', 'f00000f0'],
    ],
  },

  birth_death: {
    label: 'Birth Death Record',
    module: 'birth_death',
    rows: [
      ['Birth Record', 'f0f00010'],
      ['Death Record', 'f0f00010'],
      ['Birth Print Header Footer', '10100000'],
      ['Death Print Header Footer', '10100000'],
    ],
  },

  human_resource: {
    label: 'Human Resource',
    module: 'human_resource',
    rows: [
      ['Staff', 'ff111111'],
      ['Disable Staff', '10000000'],
      ['Staff Attendance', '71000000'],
      ['Staff Payroll', 'f1000000'],
      ['Approve Leave Request', 'f0000000'],
      ['Apply Leave', 'bbbbbbbb'],
      ['Leave Types', 'f0000000'],
      ['Department', 'f0000000'],
      ['Designation', 'f0000000'],
      ['Can See Other Users Profile', '10000000'],
      ['Staff Timeline', 'aaa00000'],
      ['Print Payslip Header Footer', '11000000'],
      ['Specialist', 'f0000000'],
    ],
  },

  duty_roster: {
    label: 'Duty Roster',
    module: 'duty_roster',
    rows: [
      ['Duty Roster', '10000000'],
      ['Shift', 'f0000000'],
      ['Roster List', 'b0000000'],
      ['Roster Assign', 'f0000000'],
    ],
  },

  annual_calendar: {
    label: 'Annual Calendar',
    module: 'annual_calendar',
    rows: [['Annual Calendar', 'f0000000']],
  },

  referral: {
    label: 'Referral',
    module: 'referral',
    rows: [
      ['Referral Category', 'ff000000'],
      ['Referral Commission', 'ff000000'],
      ['Referral Person', 'ff000000'],
      ['Referral Payment', 'ff000000'],
    ],
  },

  tpa: {
    label: 'TPA Management',
    module: 'tpa',
    rows: [
      ['Organisation', 'ff100010'],
      ['TPA Charges', 'dd100010'],
    ],
  },

  // The spec splits Income and Expense into two groups; our `finance` module
  // covers both. Kept split here to match §5's two 2-feature rows — Part III R4
  // resolves the module side.
  income: {
    label: 'Income',
    module: 'finance',
    rows: [
      ['Income', 'ff000000'],
      ['Income Head', 'ff000000'],
    ],
  },

  expense: {
    label: 'Expense',
    module: 'finance',
    rows: [
      ['Expense', 'ff000000'],
      ['Expense Head', 'ff000000'],
    ],
  },

  messaging: {
    label: 'Messaging',
    module: 'messaging',
    rows: [
      ['Notice Board', 'ffffffff'],
      ['Email / SMS', '11111111'],
      ['Send Credential', '10000000'],
    ],
  },

  inventory: {
    label: 'Inventory',
    module: 'inventory',
    rows: [
      ['Issue Item', 'bb000010'],
      ['Item Stock', 'ff000010'],
      ['Item', 'ff000000'],
      ['Store', 'ff000000'],
      ['Supplier', 'ff000000'],
      ['Item Category', 'ff000000'],
    ],
  },

  download_center: {
    label: 'Download Center',
    module: 'download_center',
    rows: [
      ['Content Type', 'ff111111'],
      ['Content Share List', '99111111'],
      ['Upload/Share Content', 'bb111111'],
      ['Generate URL', '11111111'],
      ['Share', '11111111'],
    ],
  },

  certificate: {
    label: 'Certificate',
    module: 'certificate',
    rows: [
      ['Generate Certificate', '10100000'],
      ['Certificate', 'f0f00000'],
      ['Generate Staff ID Card', '10000000'],
      ['Staff ID Card', 'f0000000'],
      ['Generate Patient ID Card', '10100000'],
      ['Patient ID Card', 'f0f00000'],
    ],
  },

  front_cms: {
    label: 'Front CMS',
    module: 'front_cms',
    rows: [
      ['Menus', 'b0000000'],
      ['Media Manager', 'b0000000'],
      ['Banner Images', 'b0000000'],
      ['Pages', 'f0000000'],
      ['Gallery', 'f0000000'],
      ['Event', 'f0000000'],
      ['News', 'f0000000'],
    ],
  },

  live_consultation: {
    label: 'Live Consultation',
    module: 'live_consultation',
    rows: [
      ['Live Consultation', 'b0b00000'],
      ['Live Meeting', 'b1b11111'],
      ['Setting', '50000000'],
    ],
  },

  reports: {
    label: 'Reports',
    module: 'reports',
    rows: [
      ['OPD Report', '11100011'],
      ['Staff Attendance Report', '10000010'],
      ['Payroll Report', '10000000'],
      ['IPD Report', '11100011'],
      ['Pharmacy Bill Report', '11010000'],
      ['Pathology Patient Report', '11001010'],
      ['Radiology Patient Report', '11000110'],
      ['OT Report', '11100011'],
      ['Blood Donor Report', '10101010'],
      ['Payroll Month Report', '10000000'],
      // §6 lists "Payroll Report" twice with identical grants. Preserved rather
      // than deduped: dropping it would make the group 46 and break §5's count
      // of 47. Keyed _2 so the ids stay unique.
      ['Payroll Report', '10000000'],
      ['User Log', '10000000'],
      ['Patient Login Credential', '11100000'],
      ['Email / SMS Log', '11000000'],
      ['TPA Report', '11100000'],
      ['Ambulance Report', '11100010'],
      ['Discharge Patient Report', '11100010'],
      ['Appointment Report', '11100010'],
      ['Blood Issue Report', '10101000'],
      ['Income Report', '11000000'],
      ['Expense Report', '11000000'],
      ['Income Group Report', '11000000'],
      ['Expense Group Report', '11000000'],
      ['Inventory Stock Report', '11000010'],
      ['Inventory Item Report', '11000010'],
      ['Inventory Issue Report', '11000010'],
      ['Expiry Medicine Report', '10010010'],
      ['Birth Report', '10100010'],
      ['Death Report', '10000010'],
      ['OPD Balance Report', '10100000'],
      ['IPD Balance Report', '11100000'],
      ['Live Consultation Report', '11100000'],
      ['Live Meeting Report', '11100000'],
      ['All Transaction Report', '11000000'],
      ['Patient Visit Report', '11100011'],
      ['Patient Bill Report', '11000000'],
      ['Referral Report', '11000000'],
      ['Component Issue Report', '10101000'],
      ['Audit Trail Report', '10001000'],
      ['Radiology Balance Report', '10000000'],
      ['Pathology Balance Report', '10000000'],
      ['Staff Day Wise Attendance Report', '10000000'],
      ['Balance Amount Report', '10100000'],
      ['Processing Transaction Report', '10000000'],
      ['Stock Report', '10000000'],
      ['Medicine Purchase Report', '10000000'],
      ['Medicine Purchase Return Report', '10000000'],
    ],
  },

  system_settings: {
    label: 'System Settings',
    module: 'setup',
    rows: [
      ['Languages', '30000000'],
      ['General Setting', '51000000'],
      ['Notification Setting', '51000000'],
      ['SMS Setting', '50000000'],
      ['Email Setting', '50000000'],
      ['Front CMS Setting', '50000000'],
      ['Payment Methods', '50000000'],
      ['Users', '10000000'],
      ['Backup', 'b0000000'],
      ['Restore', '10000000'],
      ['Symptoms Type', 'f0f00000'],
      ['Language Switcher', '10111111'],
      ['Symptoms Head', 'f0f00000'],
      ['Prefix Setting', '50000000'],
      ['Captcha Setting', '50000000'],
      ['System Notification Setting', '55000000'],
      ['Findings', 'f0000000'],
      ['Finding', 'f0000000'],
      ['Finding Category', 'f0000000'],
      ['Vital', 'f0000000'],
      ['Attendance Setting', '50000000'],
      ['ICD-10 Groups', 'f0000000'],
      ['ICD-10 Codes', 'f0000000'],
      ['Theme Studio', '50000000'],
    ],
  },

  patient: {
    label: 'Patient',
    module: 'patient',
    rows: [
      ['Patient', 'f7f11171'],
      ['Enabled/Disabled', '11100000'],
      ['Import', '10000000'],
    ],
  },

  // Its own group in the spec, and the only one where Pharmacist and
  // Radiologist hold full CRUD. Ours currently lives inside `setup`.
  hospital_charges: {
    label: 'Hospital Charges',
    module: 'setup',
    rows: [
      ['Hospital Charges', 'ff1f0f00'],
      ['Charge Category', 'ff0f0f00'],
      ['Charge Type', 'fb0b0b00'],
      ['Tax Category', 'ff1f0f00'],
      ['Unit Type', 'ff1f0f00'],
    ],
  },

  // ── The five groups with no module of ours yet (parity doc Part II §D) ──
  chat: { label: 'Chat', module: null, rows: [['Chat', '11111111']] },
  calendar_todo: { label: 'Calendar To Do List', module: null, rows: [['Calendar To Do List', 'ffffffff']] },
  survey: {
    label: 'Survey Form',
    module: null,
    rows: [
      ['Survey Form', 'f0000000'],
      ['My Survey', '10000000'],
    ],
  },
  whatsapp: { label: 'Whatsapp Messaging', module: null, rows: [['Whatsapp Messaging', '10000000']] },
  two_factor: {
    label: 'Two Factor Authenticator',
    module: null,
    rows: [
      ['Setting', '10000000'],
      ['Setup 2FA', '10000000'],
    ],
  },

  qr_attendance: {
    label: 'QR Code Attendence',
    module: 'qr_attendance',
    rows: [
      ['Attendance', '10100000'],
      ['Setting', '10100000'],
    ],
  },

  // Admin-only across every row — no other role holds a single bit.
  multi_branch: {
    label: 'Multi Branch',
    module: 'multi_branch',
    rows: [
      ['Overview', '10000000'],
      ['Setting', '10000000'],
      ['Appointment Report', '10000000'],
      ['OPD Report', '10000000'],
      ['IPD Report', '10000000'],
      ['Pharmacy Report', '10000000'],
      ['Medicine Expiry Report', '10000000'],
      ['Pathology Report', '10000000'],
      ['Radiology Report', '10000000'],
      ['Blood Donor Report', '10000000'],
      ['Blood Issue Report', '10000000'],
      ['Component Issue Report', '10000000'],
      ['Ambulance Report', '10000000'],
      ['Birth Report', '10000000'],
      ['Death Report', '10000000'],
      ['Payroll Report', '10000000'],
      ['Income Report', '10000000'],
      ['Income Detailed Report', '10000000'],
      ['Expense Report', '10000000'],
      ['Expense Detailed Report', '10000000'],
      ['Live Consultation Report', '10000000'],
      ['OT Report', '10000000'],
      ['Transaction Report', '10000000'],
      ['Transaction Detailed Report', '10000000'],
      // The sixteen Overview sub-views.
      ['Overview Appointment', '10000000'],
      ['Overview OPD', '10000000'],
      ['Overview IPD', '10000000'],
      ['Overview Operation Theatre', '10000000'],
      ['Overview Pharmacy', '10000000'],
      ['Overview Pathology', '10000000'],
      ['Overview Radiology', '10000000'],
      ['Overview Blood Donor', '10000000'],
      ['Overview Blood Issue', '10000000'],
      ['Overview Component Issue', '10000000'],
      ['Overview Ambulance', '10000000'],
      ['Overview Birth Record', '10000000'],
      ['Overview Death Record', '10000000'],
      ['Overview Staff Attendance', '10000000'],
      ['Overview Staff Payroll', '10000000'],
      ['Overview Transactions', '10000000'],
    ],
  },
};

export type FeatureGroupKey = keyof typeof TABLE;

export const FEATURE_GROUP_KEYS = Object.keys(TABLE) as FeatureGroupKey[];

// ─────────────────────────────────────────────────────────────────────────────
// Compilation
// ─────────────────────────────────────────────────────────────────────────────

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseGrants(hex: string, label: string, group: string): number[] {
  if (hex.length !== GRANT_ROLE_ORDER.length) {
    throw new Error(`${group}.${label}: grant string "${hex}" must be ${GRANT_ROLE_ORDER.length} digits`);
  }
  return [...hex].map((d) => {
    const v = parseInt(d, 16);
    if (Number.isNaN(v)) throw new Error(`${group}.${label}: "${d}" is not a hex digit`);
    return v;
  });
}

function build(): FeatureGroupDef[] {
  return FEATURE_GROUP_KEYS.map((groupKey) => {
    const g = TABLE[groupKey]!;
    const seen = new Map<string, number>();
    const features = g.rows.map((row) => {
      const [label, hex] = row;
      const grants = parseGrants(hex, label, groupKey);
      // A feature exposes exactly the toggles Admin holds (grants[0]). See the
      // Row doc comment for why that rule, and not "always four".
      const adminMask = grants[0]!;
      const actions = ACTION_ORDER.filter((a) => adminMask & ACTION_BITS[a]);
      // §6 repeats a label within one group exactly once (Reports → Payroll
      // Report). Suffix the duplicate rather than drop it, so the row count
      // still matches §5.
      const base = slug(label);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return {
        key: `${groupKey}.${base}${n > 1 ? `_${n}` : ''}`,
        group: groupKey,
        label,
        actions,
        grants,
      } satisfies FeatureDef;
    });
    return { key: groupKey, label: g.label, module: g.module, features };
  });
}

export const FEATURE_GROUPS: FeatureGroupDef[] = build();

export const FEATURES: FeatureDef[] = FEATURE_GROUPS.flatMap((g) => g.features);

export type FeatureKey = string;

const BY_KEY = new Map(FEATURES.map((f) => [f.key, f]));

export function getFeature(key: FeatureKey): FeatureDef | undefined {
  return BY_KEY.get(key);
}

/** `${featureKey}:${action}`, the feature-level analogue of PermissionKey. */
export type FeaturePermissionKey = `${string}:${ActionKey}`;

/**
 * Every (feature, action) pair a role is granted. The 751 toggles are the
 * union of this across the eight roles in GRANT_ROLE_ORDER.
 */
export function featureGrantsFor(role: RoleKey): FeaturePermissionKey[] {
  // super_admin bypasses the table — it holds every toggle on every feature.
  if (role === 'super_admin') {
    return FEATURES.flatMap((f) => f.actions.map((a) => `${f.key}:${a}` as FeaturePermissionKey));
  }
  const idx = (GRANT_ROLE_ORDER as readonly string[]).indexOf(role);
  if (idx === -1) return []; // `patient` keeps its grants in roles.ts
  const out: FeaturePermissionKey[] = [];
  for (const f of FEATURES) {
    const mask = f.grants[idx] ?? 0;
    for (const a of f.actions) {
      if (mask & ACTION_BITS[a]) out.push(`${f.key}:${a}`);
    }
  }
  return out;
}

/** Total toggles rendered by the editor — the spec's 751. */
export function countToggles(): number {
  return FEATURES.reduce((n, f) => n + f.actions.length, 0);
}
