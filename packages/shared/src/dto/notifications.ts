import { z } from 'zod';

/**
 * Notification Setting + System Notification Setting (parity plan, phase G4).
 *
 * Two tables. The first is user-facing events × channels — what a patient or
 * staff member receives, and through which medium. The second is internal
 * events with Enabled/Staff/Patient toggles and a message body.
 *
 * ── Why the event list is shorter than the reference's ──────────────────────
 * The reference lists ~9 user-facing and ~70 system events. Every row here maps
 * to something this product actually does. Listing an event we never emit would
 * be the same lie as a prefix that numbers nothing: an admin ticks Email, saves,
 * and no email is ever sent because the event does not exist. Rows arrive with
 * the features that raise them.
 *
 * Omitted from the reference on purpose: **OPD Discharge** — our OPD visit has
 * no discharge step, it simply ends; and **Live Meeting** — Live Consultation
 * exists but has no invite flow to notify about yet.
 */

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'mobile_app', 'whatsapp'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  mobile_app: 'Mobile App',
  whatsapp: 'WhatsApp',
};

export interface NotificationEventDef {
  key: string;
  label: string;
  /** What raises it, so an admin can tell which action sends the message. */
  raisedBy: string;
  /** Placeholders this event can resolve. The screen validates against these. */
  placeholders: readonly string[];
  defaultSubject: string;
  defaultBody: string;
}

/** Placeholders every event carries, because they come from the branch, not the event. */
export const COMMON_PLACEHOLDERS = ['hospital_name', 'hospital_phone', 'hospital_email'] as const;

export const NOTIFICATION_EVENTS: readonly NotificationEventDef[] = [
  {
    key: 'opd_registered',
    label: 'OPD Registration',
    raisedBy: 'A new OPD visit is created',
    placeholders: ['patient_name', 'patient_no', 'opd_no', 'doctor_name', 'visit_date', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'OPD registration confirmed',
    defaultBody:
      'Dear {{patient_name}}, your OPD visit {{opd_no}} with {{doctor_name}} on {{visit_date}} is confirmed. — {{hospital_name}}',
  },
  {
    key: 'ipd_registered',
    label: 'IPD Admission',
    raisedBy: 'A patient is admitted',
    placeholders: ['patient_name', 'patient_no', 'ipd_no', 'doctor_name', 'bed', 'admission_date', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Admission confirmed',
    defaultBody:
      'Dear {{patient_name}}, you have been admitted under {{doctor_name}}. Admission no {{ipd_no}}, bed {{bed}}. — {{hospital_name}}',
  },
  {
    key: 'ipd_discharged',
    label: 'IPD Discharge',
    raisedBy: 'An admission is discharged',
    placeholders: ['patient_name', 'ipd_no', 'discharge_date', 'doctor_name', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Discharge summary',
    defaultBody:
      'Dear {{patient_name}}, you were discharged on {{discharge_date}}. Please follow the discharge advice. — {{hospital_name}}',
  },
  {
    key: 'appointment_booked',
    label: 'Appointment Booked',
    raisedBy: 'An appointment is created',
    placeholders: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'appointment_no', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Appointment booked',
    defaultBody:
      'Dear {{patient_name}}, your appointment with {{doctor_name}} is booked for {{appointment_date}} at {{appointment_time}}. — {{hospital_name}}',
  },
  {
    key: 'appointment_approved',
    label: 'Appointment Approved',
    raisedBy: 'An appointment status becomes approved',
    placeholders: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Appointment approved',
    defaultBody:
      'Dear {{patient_name}}, your appointment with {{doctor_name}} on {{appointment_date}} at {{appointment_time}} is approved. — {{hospital_name}}',
  },
  {
    key: 'login_credential',
    label: 'Login Credential',
    raisedBy: 'Messaging ▸ Send Credential',
    placeholders: ['patient_name', 'username', 'password', 'portal_url', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Your patient portal login',
    defaultBody:
      'Dear {{patient_name}}, your login for {{hospital_name}} is {{username}} / {{password}}. Please change it after signing in.',
  },
  {
    key: 'forgot_password',
    label: 'Forgot Password',
    raisedBy: 'A password reset is requested',
    placeholders: ['patient_name', 'username', 'reset_link', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Reset your password',
    defaultBody:
      'Dear {{patient_name}}, use this link to reset your password: {{reset_link}}. Ignore this message if you did not ask for it.',
  },
  {
    key: 'payment_received',
    label: 'Payment Received',
    raisedBy: 'A payment is recorded against an invoice',
    placeholders: ['patient_name', 'amount', 'bill_no', 'transaction_no', 'balance', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Payment received',
    defaultBody:
      'Dear {{patient_name}}, we have received {{amount}} against bill {{bill_no}}. Balance {{balance}}. — {{hospital_name}}',
  },
  {
    key: 'lab_report_ready',
    label: 'Lab Report Ready',
    raisedBy: 'A pathology or radiology report is approved',
    placeholders: ['patient_name', 'test_name', 'report_date', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Your report is ready',
    defaultBody:
      'Dear {{patient_name}}, your {{test_name}} report dated {{report_date}} is ready for collection. — {{hospital_name}}',
  },
] as const;

/** Per-event configuration the admin edits. */
export const notificationEventConfigSchema = z.object({
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).max(4).default([]),
  templateId: z.string().max(80).default(''),
  whatsappTemplateId: z.string().max(80).default(''),
  subject: z.string().max(200).default(''),
  body: z.string().max(2000).default(''),
});

export type NotificationEventConfig = z.infer<typeof notificationEventConfigSchema>;

export const notificationSettingSchema = z.object({
  events: z.record(z.string(), notificationEventConfigSchema).default({}),
});

export type NotificationSettingInput = z.infer<typeof notificationSettingSchema>;

// ── System notifications ────────────────────────────────────────────────────

export interface SystemNotificationEventDef {
  key: string;
  label: string;
  placeholders: readonly string[];
  defaultSubject: string;
  defaultBody: string;
}

/**
 * Internal events. Staff/Patient decide who the notice reaches; the reference
 * has the same three toggles per row.
 */
export const SYSTEM_NOTIFICATION_EVENTS: readonly SystemNotificationEventDef[] = [
  {
    key: 'patient_registered',
    label: 'Patient Registered',
    placeholders: ['patient_name', 'patient_no', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'New patient registered',
    defaultBody: '{{patient_name}} ({{patient_no}}) has been registered.',
  },
  {
    key: 'bed_assigned',
    label: 'Bed Assigned',
    placeholders: ['patient_name', 'bed', 'ipd_no', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Bed assigned',
    defaultBody: '{{patient_name}} has been assigned bed {{bed}} ({{ipd_no}}).',
  },
  {
    key: 'invoice_generated',
    label: 'Invoice Generated',
    placeholders: ['patient_name', 'bill_no', 'amount', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Invoice generated',
    defaultBody: 'Invoice {{bill_no}} for {{amount}} was generated for {{patient_name}}.',
  },
  {
    key: 'stock_low',
    label: 'Medicine Stock Low',
    placeholders: ['medicine_name', 'available_qty', 'reorder_level', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Stock below reorder level',
    defaultBody: '{{medicine_name}} is down to {{available_qty}} (reorder at {{reorder_level}}).',
  },
  {
    key: 'blood_stock_low',
    label: 'Blood Stock Low',
    placeholders: ['blood_group', 'available_units', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Blood stock low',
    defaultBody: 'Only {{available_units}} unit(s) of {{blood_group}} remain.',
  },
  {
    key: 'leave_requested',
    label: 'Leave Requested',
    placeholders: ['staff_name', 'leave_type', 'from_date', 'to_date', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Leave request awaiting approval',
    defaultBody: '{{staff_name}} requested {{leave_type}} from {{from_date}} to {{to_date}}.',
  },
  {
    key: 'leave_decided',
    label: 'Leave Approved or Disapproved',
    placeholders: ['staff_name', 'leave_type', 'status', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Leave request {{status}}',
    defaultBody: 'Your {{leave_type}} request has been {{status}}.',
  },
  {
    key: 'birth_recorded',
    label: 'Birth Recorded',
    placeholders: ['child_name', 'reference_no', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Birth record created',
    defaultBody: 'A birth record {{reference_no}} was created for {{child_name}}.',
  },
  {
    key: 'death_recorded',
    label: 'Death Recorded',
    placeholders: ['patient_name', 'reference_no', ...COMMON_PLACEHOLDERS],
    defaultSubject: 'Death record created',
    defaultBody: 'A death record {{reference_no}} was created for {{patient_name}}.',
  },
] as const;

export const systemNotificationEventConfigSchema = z.object({
  enabled: z.boolean().default(false),
  toStaff: z.boolean().default(true),
  toPatient: z.boolean().default(false),
  subject: z.string().max(200).default(''),
  body: z.string().max(2000).default(''),
});

export type SystemNotificationEventConfig = z.infer<typeof systemNotificationEventConfigSchema>;

export const systemNotificationSettingSchema = z.object({
  events: z.record(z.string(), systemNotificationEventConfigSchema).default({}),
});

export type SystemNotificationSettingInput = z.infer<typeof systemNotificationSettingSchema>;

// ── The renderer ────────────────────────────────────────────────────────────

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export interface RenderResult {
  text: string;
  /** Placeholders in the template that the context could not fill. */
  unresolved: string[];
}

/**
 * Resolve `{{placeholder}}` against a context.
 *
 * Unresolved placeholders are **reported, not silently blanked**. A typo like
 * `{{patinet_name}}` would otherwise reach a patient's phone either as raw
 * braces or as a hole in the sentence, and nobody would find out. The Settings
 * screen renders a live preview and refuses to save a template whose
 * placeholders the event cannot supply, so the mistake is caught while the
 * admin is still looking at it.
 *
 * A resolved value of empty string counts as resolved: "no middle name" is an
 * answer, whereas a missing key is a mistake.
 */
export function renderTemplate(template: string, context: Record<string, unknown>): RenderResult {
  const unresolved: string[] = [];
  const text = template.replace(PLACEHOLDER, (_match, rawName: string) => {
    const name = rawName.toLowerCase();
    if (!(name in context)) {
      unresolved.push(name);
      return `{{${name}}}`;
    }
    const value = context[name];
    return value === null || value === undefined ? '' : String(value);
  });
  return { text, unresolved: [...new Set(unresolved)] };
}

/** Every placeholder a template references, in order of first appearance. */
export function placeholdersIn(template: string): string[] {
  const found: string[] = [];
  for (const m of template.matchAll(PLACEHOLDER)) {
    const name = m[1];
    if (name) found.push(name.toLowerCase());
  }
  return [...new Set(found)];
}

/**
 * Placeholders the template uses that the event cannot supply. Empty means the
 * template is safe to save.
 */
export function unknownPlaceholders(template: string, allowed: readonly string[]): string[] {
  const ok = new Set(allowed.map((p) => p.toLowerCase()));
  return placeholdersIn(template).filter((p) => !ok.has(p));
}
