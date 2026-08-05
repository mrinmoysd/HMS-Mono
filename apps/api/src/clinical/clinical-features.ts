import type { ActionKey } from '@smart-hospital/shared';
import type { RequiredFeature } from '../rbac/require-feature.decorator';

/**
 * Clinical records live under OPD or IPD in the spec, as separate features with
 * separate grants. Our clinical endpoints take an optional `encounterType`, so
 * the required key is a per-request question.
 *
 * When the type is given, that side's feature applies. When it is absent the
 * view spans both encounters, so BOTH are required — the intersection. That is
 * a no-op wherever the pair is identical (timeline, vitals, prescription, live
 * consult) and a deliberate tightening where it is not: IPD Medication is `f`
 * for Accountant while OPD Medication is `1`, and OPD Lab Investigation is
 * granted to Receptionist while the IPD one is not.
 *
 * An unrecognised type returns null, which denies.
 */
export function encounterFeature(
  type: unknown,
  opdKey: string,
  ipdKey: string,
  action: ActionKey,
): RequiredFeature[] | RequiredFeature | null {
  if (type === 'opd') return { feature: opdKey, action };
  if (type === 'ipd') return { feature: ipdKey, action };
  if (type === undefined || type === null || type === '') {
    return [
      { feature: opdKey, action },
      { feature: ipdKey, action },
    ];
  }
  return null;
}

/** The pairs, so a typo in one controller cannot diverge from another. */
export const ENCOUNTER_FEATURES = {
  timeline: ['opd.opd_timeline', 'ipd.ipd_timeline'],
  vitals: ['opd.opd_vitals', 'ipd.ipd_vitals'],
  medication: ['opd.opd_medication', 'ipd.ipd_medication'],
  prescription: ['opd.prescription', 'ipd.prescription'],
  lab: ['opd.lab_investigation', 'ipd.lab_investigation'],
  operationTheatre: ['opd.operation_theatre', 'ipd.operation_theatre'],
  liveConsult: ['opd.live_consult', 'ipd.live_consult'],
} as const satisfies Record<string, readonly [string, string]>;
