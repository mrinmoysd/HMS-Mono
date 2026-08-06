import { z } from 'zod';

/**
 * The settings registry (parity plan, phase G0).
 *
 * One entry per setting group, each with a Zod schema and a default. Three
 * things follow from keeping them together:
 *
 *  · a missing database row is never an error — it is the default;
 *  · the API validates writes against the same schema the client renders from;
 *  · adding a setting is one entry here, not a migration.
 *
 * Secrets are NOT in this file. They live in the provider registries (phase
 * G5/G6) because their shape varies per provider, and mixing them in would make
 * it easy to forget the `isSecret` flag on one field.
 */

// ── General Setting ────────────────────────────────────────────────────────
export const DATE_FORMATS = ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd', 'dd-mm-yyyy'] as const;
export const TIME_FORMATS = ['12 Hour', '24 Hour'] as const;
export const SCAN_TYPES = ['barcode', 'qr'] as const;

/**
 * Every field has a default, deliberately.
 *
 * `SettingsService.get` reads a missing row as `schema.parse({})`, so a schema
 * with a field that has no default would make a fresh install throw on read
 * rather than show an empty form — which is exactly what happened the first
 * time this ran. The invariant is asserted in settings.registry.spec.ts.
 *
 * `.min(1)` still applies on write, so an admin cannot blank these out; the
 * default only covers "never configured".
 */
export const generalSettingSchema = z.object({
  hospitalName: z.string().min(1).max(120).default('Smart Hospital'),
  hospitalCode: z.string().max(40).default(''),
  address: z.string().min(1).max(400).default('Address not set'),
  phone: z.string().min(1).max(40).default('—'),
  email: z.string().email().default('admin@example.com'),
  logoUrl: z.string().max(500).default(''),
  smallLogoUrl: z.string().max(500).default(''),

  language: z.string().min(2).max(40).default('English'),

  dateFormat: z.enum(DATE_FORMATS).default('dd/mm/yyyy'),
  timeFormat: z.enum(TIME_FORMATS).default('12 Hour'),
  timeZone: z.string().min(1).max(60).default('Asia/Kolkata'),

  currency: z.string().min(1).max(10).default('INR'),
  currencySymbol: z.string().min(1).max(5).default('₹'),
  creditLimit: z.coerce.number().min(0).default(20000),

  // Miscellaneous. `doctorRestrictionMode` limits a doctor to their own
  // patients; `patientPanel` is the self-service portal on/off.
  doctorRestrictionMode: z.boolean().default(false),
  patientPanel: z.boolean().default(true),
  patientDeleteAccount: z.boolean().default(false),
  scanType: z.enum(SCAN_TYPES).default('barcode'),
  notificationPollSeconds: z.coerce.number().int().min(15).max(3600).default(60),
});

export type GeneralSettingInput = z.infer<typeof generalSettingSchema>;

export const GENERAL_SETTING_DEFAULT: GeneralSettingInput = generalSettingSchema.parse({});

/**
 * Every settings schema, for the test that asserts each one parses `{}`.
 * A new setting group must be added here — that is the point.
 */
export const SETTINGS_SCHEMAS = { general: generalSettingSchema } as const;

// ── Prefix Setting ─────────────────────────────────────────────────────────
/**
 * The 16 prefixes the reference exposes, mapped to our SequenceCounter keys.
 *
 * `key` is the counter this edits — these are not new storage, they are a UI
 * over `SequenceCounter.prefix`, which already drives every generated number.
 */
export const PREFIX_FIELDS = [
  { key: 'ipd', label: 'IPD No', fallback: 'IPDN' },
  { key: 'opd', label: 'OPD No', fallback: 'OPDN' },
  { key: 'ipd_prescription', label: 'IPD Prescription', fallback: 'IPDP' },
  { key: 'opd_prescription', label: 'OPD Prescription', fallback: 'OPDP' },
  { key: 'appointment', label: 'Appointment', fallback: 'APPNO' },
  { key: 'pharmacy_bill', label: 'Pharmacy Bill', fallback: 'PHARMAB' },
  { key: 'operation', label: 'Operation Reference No', fallback: 'OTREF' },
  { key: 'blood_bill', label: 'Blood Bank Bill', fallback: 'BIB' },
  { key: 'ambulance_bill', label: 'Ambulance Call Bill', fallback: 'ACB' },
  { key: 'radiology_bill', label: 'Radiology Bill', fallback: 'RADIOB' },
  { key: 'pathology_bill', label: 'Pathology Bill', fallback: 'PATHOB' },
  { key: 'opd_checkup', label: 'OPD Checkup Id', fallback: 'CHKID' },
  { key: 'pharmacy_purchase', label: 'Pharmacy Purchase No', fallback: 'PCHNO' },
  { key: 'transaction', label: 'Transaction ID', fallback: 'TRANID' },
  { key: 'birth', label: 'Birth Record Reference No', fallback: 'BREF' },
  { key: 'death', label: 'Death Record Reference No', fallback: 'DREF' },
] as const;

export type PrefixKey = (typeof PREFIX_FIELDS)[number]['key'];

export const prefixUpdateSchema = z.object({
  prefixes: z
    .array(
      z.object({
        key: z.string().min(1),
        // Uppercase letters and digits only. A prefix with a slash or space
        // ends up inside every printed bill number and every URL that carries
        // one, so it is worth refusing early.
        prefix: z
          .string()
          .max(12)
          .regex(/^[A-Z0-9]*$/, 'Use capital letters and digits only'),
      }),
    )
    .min(1)
    .max(40),
});

export type PrefixUpdateInput = z.infer<typeof prefixUpdateSchema>;

export interface PrefixRowDto {
  key: string;
  label: string;
  prefix: string;
  /** The next number this counter would produce, e.g. `IPDN000042`. */
  nextExample: string;
}

// ── The settings shell ─────────────────────────────────────────────────────
/** One entry in the Settings rail. `href` is null for screens not built yet. */
export interface SettingsNavItemDto {
  key: string;
  label: string;
  group: string;
  href: string | null;
  comingSoon: boolean;
}

export interface SettingsOverviewDto {
  nav: SettingsNavItemDto[];
  /** False when SETTINGS_ENCRYPTION_KEY is absent — credential screens warn. */
  secretsConfigured: boolean;
}
