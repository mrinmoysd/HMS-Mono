import * as path from 'node:path';

export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3001';
export const PATIENT_URL = process.env.E2E_PATIENT_URL ?? 'http://localhost:3002';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

export const AUTH_DIR = path.join(__dirname, '..', '.auth');

/**
 * Demo logins created by `apps/api/prisma/seed.ts`
 * (username == role slug shorthand, password == "password").
 */
export const ROLES = [
  'superadmin',
  'admin',
  'accountant',
  'doctor',
  'pharmacist',
  'pathologist',
  'radiologist',
  'receptionist',
  'nurse',
] as const;

export type Role = (typeof ROLES)[number];

export const PASSWORD = 'password';

export function storageStateFor(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/** localStorage key used by apps/web/src/lib/auth-store.ts (zustand persist). */
export const AUTH_STORAGE_KEY = 'sh-auth';

/** Console messages that are noise rather than product bugs. */
export const CONSOLE_IGNORE: RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /react-devtools/i,
  /Warning: Extra attributes from the server/i,
  /favicon\.ico/i,
  /net::ERR_ABORTED.*_next\/static/i,
];
