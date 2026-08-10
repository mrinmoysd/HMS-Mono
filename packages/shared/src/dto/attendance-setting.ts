import { z } from 'zod';
import type { AttendanceStatus } from './hr';

/**
 * Setup ▸ Settings ▸ Attendance Setting — the time bands that decide what a
 * check-in counts as, per role.
 *
 * Until now `markAttendance` recorded `present` no matter what time somebody
 * clocked in: a QR scan at 11:00 was indistinguishable from one at 08:00. The
 * bands are what turn a timestamp into a judgement, and `classifyArrival` is
 * that judgement in one place, shared by the API and the screen so a hospital
 * can see the rule it is about to apply before anybody is marked late by it.
 */

/** "HH:MM" on a 24-hour clock. Empty means the band is not configured. */
const timeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM on a 24-hour clock')
  .or(z.literal(''))
  .default('');

/**
 * One role's ladder. Each threshold is inclusive: arriving exactly on it earns
 * the better status, because a rule that punishes somebody for being precisely
 * on time is one nobody would defend out loud.
 */
export const roleAttendanceBandSchema = z.object({
  /** At or before this → Present. */
  presentUntil: timeField,
  /** After Present, at or before this → Late. */
  lateUntil: timeField,
  /** After Late, at or before this → Half Day. */
  halfDayUntil: timeField,
  /** After Half Day, at or before this → Half Day (Second Shift). */
  halfDaySecondShiftUntil: timeField,
});
export type RoleAttendanceBand = z.infer<typeof roleAttendanceBandSchema>;

export const attendanceSettingSchema = z.object({
  /**
   * Whether QR and barcode check-in are accepted at all. Off means the API
   * refuses those methods rather than quietly recording them as manual — an
   * attendance record whose stated source is a lie is worse than a refusal.
   */
  biometricEnabled: z.boolean().default(false),
  /**
   * Arrivals later than every configured band. `absent` is the strict reading;
   * `half_day` suits a hospital that would rather record a short day than an
   * argument. Configurable because both are defensible.
   */
  afterLastBand: z.enum(['absent', 'half_day']).default('absent'),
  /** Keyed by role slug. A role with no entry is not classified at all. */
  roles: z.record(roleAttendanceBandSchema).default({}),
});
export type AttendanceSettingInput = z.infer<typeof attendanceSettingSchema>;

// ── Classification ────────────────────────────────────────────────────

/** Minutes since midnight, or null when the value is absent or malformed. */
export function toMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** The configured thresholds for a role, in ladder order, ignoring blanks. */
function ladder(band: RoleAttendanceBand): { limit: number; status: AttendanceStatus }[] {
  const steps: { value: string; status: AttendanceStatus }[] = [
    { value: band.presentUntil, status: 'present' },
    { value: band.lateUntil, status: 'late' },
    { value: band.halfDayUntil, status: 'half_day' },
    { value: band.halfDaySecondShiftUntil, status: 'half_day_second_shift' },
  ];
  const out: { limit: number; status: AttendanceStatus }[] = [];
  for (const s of steps) {
    const limit = toMinutes(s.value);
    if (limit !== null) out.push({ limit, status: s.status });
  }
  return out;
}

/**
 * What an arrival at `arrivalHHMM` counts as for `roleSlug`.
 *
 * Returns null when the caller should not classify at all: no bands for the
 * role, or an unreadable arrival time. **Null means "leave the existing
 * behaviour alone", never "absent".** A hospital that has not configured a
 * role must not discover that every nurse was silently marked absent the day
 * this shipped, so the burden of proof is on the configuration, not the staff.
 */
export function classifyArrival(
  setting: AttendanceSettingInput,
  roleSlug: string,
  arrivalHHMM: string,
): AttendanceStatus | null {
  const band = setting.roles[roleSlug];
  if (!band) return null;

  const arrival = toMinutes(arrivalHHMM);
  if (arrival === null) return null;

  const steps = ladder(band);
  if (steps.length === 0) return null;

  for (const step of steps) {
    if (arrival <= step.limit) return step.status;
  }
  return setting.afterLastBand;
}

/**
 * Thresholds that run backwards, which would make a later arrival earn a
 * better status than an earlier one.
 *
 * Refused rather than silently sorted: a ladder typed out of order is far more
 * likely to be a typo in one field than a deliberate ordering, and quietly
 * reordering it would hide the mistake behind a rule that still looks wrong on
 * the screen.
 */
export function attendanceSettingProblems(setting: AttendanceSettingInput): string[] {
  const problems: string[] = [];
  const labels: Record<keyof RoleAttendanceBand, string> = {
    presentUntil: 'Present',
    lateUntil: 'Late',
    halfDayUntil: 'Half Day',
    halfDaySecondShiftUntil: 'Half Day (Second Shift)',
  };
  const order: (keyof RoleAttendanceBand)[] = [
    'presentUntil',
    'lateUntil',
    'halfDayUntil',
    'halfDaySecondShiftUntil',
  ];

  for (const [roleSlug, band] of Object.entries(setting.roles)) {
    let previous: { key: keyof RoleAttendanceBand; limit: number } | null = null;
    for (const key of order) {
      const limit = toMinutes(band[key]);
      if (limit === null) continue;
      if (previous && limit <= previous.limit) {
        problems.push(
          `${roleSlug}: ${labels[key]} (${band[key]}) must be later than ${labels[previous.key]} (${band[previous.key]})`,
        );
      }
      previous = { key, limit };
    }
  }
  return problems;
}

/** True when the role would actually classify anything. */
export function roleIsConfigured(setting: AttendanceSettingInput, roleSlug: string): boolean {
  const band = setting.roles[roleSlug];
  return !!band && ladder(band).length > 0;
}
