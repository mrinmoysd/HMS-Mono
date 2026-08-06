import { Ability } from '@smart-hospital/shared';
import type { FeaturePermissionKey, PermissionKey } from '@smart-hospital/shared';

/**
 * Build an Ability from the JWT payload, for authorisation a guard cannot do.
 *
 * A decorator answers "may this role call this endpoint". Some questions are
 * about the data instead — which invoices this user may see, whose leave
 * request this is — and those can only be answered once the row is loaded. Ask
 * them in the service, with this.
 *
 * It started in billing/ and moved here when HR needed the same thing.
 */
export function abilityOf(user: { permissions?: string[]; features?: string[] }): Ability {
  return new Ability(
    (user.permissions ?? []) as PermissionKey[],
    (user.features ?? []) as FeaturePermissionKey[],
  );
}
