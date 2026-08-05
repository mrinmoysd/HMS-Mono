import { SetMetadata } from '@nestjs/common';
import type { ActionKey } from '@smart-hospital/shared';

export const FEATURE_KEY = 'required_feature';

export interface RequiredFeature {
  feature: string;
  action: ActionKey;
}

/**
 * Guard a handler with one or more required (feature, action) permissions — the
 * precise check, from the 332-row table in packages/shared/src/rbac/features.ts.
 *
 * Prefer this over @RequirePermission. The module-level decorator is what R1 is
 * migrating away from: `opd:delete` is one switch covering 22 OPD features, so
 * a nurse allowed to delete a nurse note also passes the gate on
 * DELETE /opd/:id. A feature key does not have that problem.
 *
 * Pairs are ANDed. That matters where one request touches two features — the
 * canonical case is Move-to-IPD, which is an OPD action that writes an IPD
 * admission, and so must satisfy both.
 *
 *   @RequireFeature('opd.opd_patient', 'delete')
 *   @RequireFeature(['opd.move_patient_in_ipd', 'view'], ['ipd.ipd_patients', 'add'])
 */
export const RequireFeature = (
  ...specs: [feature: string, action: ActionKey][] | [feature: string, action: ActionKey]
) => {
  // Single pair passed loose: RequireFeature('opd.visit', 'add').
  const list: RequiredFeature[] =
    typeof specs[0] === 'string'
      ? [{ feature: specs[0], action: specs[1] as ActionKey }]
      : (specs as [string, ActionKey][]).map(([feature, action]) => ({ feature, action }));
  return SetMetadata(FEATURE_KEY, list);
};

export const FEATURE_RESOLVER_KEY = 'required_feature_resolver';

/** What a resolver receives — just the parts of the request it may branch on. */
export interface FeatureResolverContext {
  params: Record<string, string>;
  query: Record<string, unknown>;
  /**
   * The parsed body, when there is one. Blood Bank needs it: a blood issue and
   * a component issue are separate features with different grants, and POST
   * /issues discriminates on `body.type` rather than on the URL.
   *
   * This is the raw body — guards run before validation pipes, so treat it as
   * untrusted and read it defensively. A resolver that cannot make sense of it
   * should return null, which denies.
   */
  body: Record<string, unknown>;
}

/**
 * Guard a handler whose feature depends on the request.
 *
 * Billing needs this. The spec models billing per module — OPD Billing,
 * Pharmacy Billing, Pathology Billing and so on are seven separate features
 * with different grants — but our endpoints are generic over a `:type` route
 * param, so the required key is not known until the request arrives.
 *
 * Returning null denies. That is deliberate: an unrecognised `:type` should
 * fail closed rather than fall through to whatever the last branch was.
 *
 *   @RequireFeatureFor((c) => billingFeature(c.params.type, 'view'))
 */
export const RequireFeatureFor = (
  resolve: (ctx: FeatureResolverContext) => RequiredFeature[] | RequiredFeature | null,
) => SetMetadata(FEATURE_RESOLVER_KEY, resolve);
