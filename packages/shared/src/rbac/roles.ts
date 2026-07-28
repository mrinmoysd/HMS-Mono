import { MODULES, type ModuleKey } from './modules';

/** The 9 fixed system roles (FRD §1.4) + Patient for the self-service portal. */
export const ROLES = [
  'super_admin',
  'admin',
  'accountant',
  'doctor',
  'pharmacist',
  'pathologist',
  'radiologist',
  'receptionist',
  'nurse',
  'patient',
] as const;

export type RoleKey = (typeof ROLES)[number];

export const ROLE_META: Record<RoleKey, { label: string; protected?: boolean; portal?: boolean }> = {
  super_admin: { label: 'Super Admin', protected: true },
  admin: { label: 'Admin' },
  accountant: { label: 'Accountant' },
  doctor: { label: 'Doctor' },
  pharmacist: { label: 'Pharmacist' },
  pathologist: { label: 'Pathologist' },
  radiologist: { label: 'Radiologist' },
  receptionist: { label: 'Receptionist' },
  nurse: { label: 'Nurse' },
  patient: { label: 'Patient', portal: true },
};

/** Granular action set applied per module (FRD View/Add/Edit/Delete matrix). */
export const ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
export type ActionKey = (typeof ACTIONS)[number];

/**
 * Navigation-level module access per operational role, transcribed from
 * docs/PERMISSION_MATRIX.md §2 (FRD §2.31.2). super_admin & admin get every module.
 */
const OPERATIONAL_ACCESS: Record<Exclude<RoleKey, 'super_admin' | 'admin' | 'patient'>, ModuleKey[]> = {
  doctor: [
    'dashboard', 'patient', 'billing', 'appointment', 'opd', 'ipd', 'pathology', 'radiology',
    'blood_bank', 'ambulance', 'birth_death', 'human_resource', 'qr_attendance', 'tpa',
    'messaging', 'download_center', 'live_consultation', 'reports', 'setup',
  ],
  pharmacist: [
    'dashboard', 'patient', 'billing', 'opd', 'ipd', 'pharmacy', 'blood_bank', 'human_resource',
    'messaging', 'download_center', 'live_consultation', 'reports', 'setup',
  ],
  pathologist: [
    'dashboard', 'patient', 'billing', 'opd', 'ipd', 'pathology', 'blood_bank', 'human_resource',
    'messaging', 'download_center', 'live_consultation', 'reports', 'setup',
  ],
  radiologist: [
    'dashboard', 'patient', 'billing', 'opd', 'ipd', 'radiology', 'human_resource', 'messaging',
    'download_center', 'live_consultation', 'reports', 'setup',
  ],
  accountant: [
    'dashboard', 'patient', 'billing', 'appointment', 'opd', 'ipd', 'pharmacy', 'pathology',
    'radiology', 'blood_bank', 'ambulance', 'human_resource', 'referral', 'tpa', 'finance',
    'messaging', 'inventory', 'download_center', 'live_consultation', 'reports', 'setup',
  ],
  receptionist: [
    'dashboard', 'patient', 'billing', 'appointment', 'opd', 'ipd', 'pharmacy', 'pathology',
    'radiology', 'blood_bank', 'ambulance', 'front_office', 'birth_death', 'human_resource',
    'tpa', 'messaging', 'inventory', 'download_center', 'live_consultation', 'reports', 'setup',
  ],
  nurse: [
    'dashboard', 'patient', 'opd', 'ipd', 'human_resource', 'messaging', 'download_center',
    'live_consultation', 'reports', 'setup',
  ],
};

/** Modules where operational roles get add/edit by default (they own the workflow). */
const OPERATIONAL_WRITE: Record<Exclude<RoleKey, 'super_admin' | 'admin' | 'patient'>, ModuleKey[]> = {
  doctor: ['appointment', 'opd', 'ipd', 'pathology', 'radiology', 'blood_bank', 'birth_death', 'live_consultation'],
  pharmacist: ['pharmacy', 'opd', 'ipd', 'blood_bank'],
  pathologist: ['pathology', 'opd', 'ipd', 'blood_bank'],
  radiologist: ['radiology', 'opd', 'ipd'],
  accountant: ['billing', 'appointment', 'opd', 'ipd', 'pharmacy', 'pathology', 'radiology', 'blood_bank', 'ambulance', 'referral', 'tpa', 'finance', 'inventory'],
  receptionist: ['appointment', 'opd', 'ipd', 'front_office', 'birth_death', 'ambulance', 'tpa'],
  nurse: ['opd', 'ipd'],
};

export interface ModuleGrant {
  module: ModuleKey;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

/**
 * Build the default permission matrix for a role: which modules, and which
 * View/Add/Edit/Delete actions. These are SEED defaults — admin can override at
 * runtime via Setup → Roles Permissions. See docs/PERMISSION_MATRIX.md §4.
 */
export function defaultGrantsFor(role: RoleKey): ModuleGrant[] {
  if (role === 'super_admin' || role === 'admin') {
    // Full module list, all actions. (Admin's inability to edit the Super Admin
    // role row is enforced in app logic, not here — see PERMISSION_MATRIX §4.)
    return MODULES.map((module) => ({ module, view: true, add: true, edit: true, delete: true }));
  }
  if (role === 'patient') {
    // Portal: view own records + book appointments/messages. Scoping to own
    // patient_id is enforced at query time, not in this matrix.
    return [
      grant('dashboard', { view: true }),
      grant('appointment', { view: true, add: true }),
      grant('opd', { view: true }),
      grant('ipd', { view: true }),
      grant('billing', { view: true }),
      grant('reports', { view: true }),
      grant('messaging', { view: true, add: true }),
      grant('live_consultation', { view: true }),
    ];
  }
  const access = OPERATIONAL_ACCESS[role];
  const write = new Set(OPERATIONAL_WRITE[role]);
  return access.map((module) =>
    grant(module, { view: true, add: write.has(module), edit: write.has(module), delete: false }),
  );
}

function grant(module: ModuleKey, partial: Partial<Omit<ModuleGrant, 'module'>>): ModuleGrant {
  return { module, view: false, add: false, edit: false, delete: false, ...partial };
}
