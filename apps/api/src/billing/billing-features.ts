import { ForbiddenException } from '@nestjs/common';
import { Ability } from '@smart-hospital/shared';
import type { ActionKey, FeaturePermissionKey, PermissionKey } from '@smart-hospital/shared';
import type { RequiredFeature } from '../rbac/require-feature.decorator';

/**
 * Billing is modelled per module in the spec: seven `<Module> Billing` features
 * and seven matching `<Module> Billing Payment` features, with different grants
 * — Pharmacist may see Pharmacy Billing and nothing else, Pathologist only
 * Pathology, and so on. Our endpoints are generic over a `:type` param, so the
 * mapping has to happen per request. It lives here rather than inline so the
 * two controllers cannot drift apart.
 *
 * Shape of the group, worth knowing before changing anything:
 *   `<Module> Billing`          — view only. Nobody may edit or delete a bill.
 *   `<Module> Billing Payment`  — view + add. Recording a payment is `add`.
 * There is no delete toggle anywhere in the 18 Billing features.
 */
const BY_TYPE: Record<string, { bill: string; payment: string }> = {
  opd: { bill: 'billing.opd_billing', payment: 'billing.opd_billing_payment' },
  ipd: { bill: 'billing.ipd_billing', payment: 'billing.ipd_billing_payment' },
  pharmacy: { bill: 'billing.pharmacy_billing', payment: 'billing.pharmacy_billing_payment' },
  pathology: { bill: 'billing.pathology_billing', payment: 'billing.pathology_billing_payment' },
  radiology: { bill: 'billing.radiology_billing', payment: 'billing.radiology_billing_payment' },
  blood_bank: { bill: 'billing.blood_bank_billing', payment: 'billing.blood_bank_billing_payment' },
  ambulance: { bill: 'billing.ambulance_billing', payment: 'billing.ambulance_billing_payment' },
};

/** Aliases the API already accepts on `:type` or `invoice.module`. */
const ALIASES: Record<string, string> = {
  blood: 'blood_bank',
  bloodbank: 'blood_bank',
  'blood-bank': 'blood_bank',
  lab: 'pathology',
  radio: 'radiology',
};

function normalise(type: string | undefined): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  const key = ALIASES[t] ?? t;
  return key in BY_TYPE ? key : null;
}

/**
 * The bill-level feature for a module, or null if the type is unrecognised.
 * Null denies — an unknown `:type` must not fall through to some default.
 */
export function billingFeature(type: string | undefined, action: ActionKey): RequiredFeature | null {
  const key = normalise(type);
  return key ? { feature: BY_TYPE[key]!.bill, action } : null;
}

/** The payment-level feature for a module, or null if unrecognised. */
export function billingPaymentFeature(
  type: string | undefined,
  action: ActionKey,
): RequiredFeature | null {
  const key = normalise(type);
  return key ? { feature: BY_TYPE[key]!.payment, action } : null;
}

/** Every module the billing features cover — used by the cross-module list. */
export const BILLING_TYPES = Object.keys(BY_TYPE);

/**
 * The modules whose bills this user may see.
 *
 * The invoice endpoints key off an invoice id, so the module is a property of
 * the row rather than of the request — a guard cannot know it without loading
 * the record. That makes billing authorisation data-dependent, and the service
 * is the only place it can be decided correctly. `@RequirePermission('billing',
 * 'view')` stays on those handlers as the coarse gate; this narrows it.
 *
 * Concretely: Pharmacist holds Pharmacy Billing and nothing else, so a bare
 * `billing:view` would have shown them every OPD, IPD and Pathology bill.
 */
export function viewableBillingModules(ability: Ability): string[] {
  return BILLING_TYPES.filter((t) => ability.canFeature(BY_TYPE[t]!.bill, 'view'));
}

/** Throws unless the user may view bills of this module. */
export function assertCanViewBilling(ability: Ability, module: string | null | undefined): void {
  const f = billingFeature(module ?? undefined, 'view');
  if (!f || !ability.canFeature(f.feature, f.action)) {
    throw new ForbiddenException(`Missing permission: ${f?.feature ?? `billing.${module}`}:view`);
  }
}

/** Throws unless the user may record a payment against bills of this module. */
export function assertCanAddBillingPayment(ability: Ability, module: string | null | undefined): void {
  const f = billingPaymentFeature(module ?? undefined, 'add');
  if (!f || !ability.canFeature(f.feature, f.action)) {
    throw new ForbiddenException(`Missing permission: ${f?.feature ?? `billing.${module}`}:add`);
  }
}

/** Build an ability from the request user, both levels. */
export function abilityOf(user: { permissions?: string[]; features?: string[] }): Ability {
  return new Ability(
    (user.permissions ?? []) as PermissionKey[],
    (user.features ?? []) as FeaturePermissionKey[],
  );
}
