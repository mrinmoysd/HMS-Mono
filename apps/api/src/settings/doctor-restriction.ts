import type { RequestUser } from '../common/types/request-user';

/**
 * Doctor Restriction Mode (Settings parity, G1).
 *
 * When Setup ▸ Settings ▸ General turns it on, a doctor sees only the patients
 * they are responsible for: their own OPD visits, IPD admissions and
 * appointments, and the patients behind them.
 *
 * ── Why this is a function and not an `if` in four services ──────────────────
 * The rule has to be applied identically in every list, and the failure mode is
 * silent in the dangerous direction: forget it in one query and that screen
 * quietly shows the whole hospital while the other three look correct. One
 * helper, used everywhere, is the only version of this that can be reviewed.
 *
 * ── Who it applies to ───────────────────────────────────────────────────────
 * Doctors only. It is a scoping rule for clinicians, not an authorisation
 * boundary for administrators: a Super Admin or Admin still sees everything,
 * because the setting exists so a doctor is not distracted by other doctors'
 * patients, not to hide data from the people who run the hospital.
 */
export function restrictionApplies(user: RequestUser | undefined, enabled: boolean): boolean {
  return enabled && user?.roleSlug === 'doctor';
}

/**
 * A `where` fragment for OPD visits and IPD admissions, both of which carry
 * `consultantId`. Returns `{}` when the rule does not apply, so callers can
 * spread it unconditionally and never branch.
 */
export function consultantScope(
  user: RequestUser | undefined,
  enabled: boolean,
): { consultantId?: string } {
  return restrictionApplies(user, enabled) && user ? { consultantId: user.id } : {};
}

/** The same for appointments, which carry `doctorId`. */
export function doctorScope(
  user: RequestUser | undefined,
  enabled: boolean,
): { doctorId?: string } {
  return restrictionApplies(user, enabled) && user ? { doctorId: user.id } : {};
}

/**
 * A `where` fragment for the patient list: patients this doctor has any
 * clinical relationship with.
 *
 * Expressed as three `some` relations OR'd together rather than a precomputed
 * patient-id list, so it stays a single query and cannot drift out of date
 * between the lookup and the read.
 */
export function patientScope(
  user: RequestUser | undefined,
  enabled: boolean,
): Record<string, unknown> {
  if (!restrictionApplies(user, enabled) || !user) return {};
  return {
    OR: [
      { opdVisits: { some: { consultantId: user.id } } },
      { ipdAdmissions: { some: { consultantId: user.id } } },
      { appointments: { some: { doctorId: user.id } } },
    ],
  };
}
