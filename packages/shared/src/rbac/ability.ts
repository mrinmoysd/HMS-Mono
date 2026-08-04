import type { ModuleKey } from './modules';
import type { ActionKey, ModuleGrant, RoleKey } from './roles';
import {
  ACTION_BITS,
  FEATURE_GROUPS,
  featureGrantsFor,
  getFeature,
  type FeaturePermissionKey,
} from './features';

/**
 * A flat, serializable permission set that both the API (guards) and the web
 * (sidebar / button gating) consume. Built from the user's role_permission rows.
 *
 * Key format: `${module}:${action}` e.g. "patient:add".
 */
export type PermissionKey = `${ModuleKey}:${ActionKey}`;

export function grantsToPermissionKeys(grants: ModuleGrant[]): PermissionKey[] {
  const keys: PermissionKey[] = [];
  for (const g of grants) {
    if (g.view) keys.push(`${g.module}:view`);
    if (g.add) keys.push(`${g.module}:add`);
    if (g.edit) keys.push(`${g.module}:edit`);
    if (g.delete) keys.push(`${g.module}:delete`);
  }
  return keys;
}

/**
 * Roll a feature-level grant set up to the legacy module × action keys.
 *
 * `opd:view` becomes "view on at least one OPD feature". That is the only
 * derivation that keeps the 383 existing `@RequirePermission('opd', 'view')`
 * call sites behaving as they do today while R1 migrates them one module at a
 * time — a module gate should open whenever any feature behind it is readable,
 * or the sidebar would hide a page the user can legitimately open.
 *
 * It is deliberately permissive, and that is the trade-off of the transition:
 * module-level checks stay exactly as coarse as they were. They get no coarser.
 * Precision arrives when a call site moves to `canFeature`, not before.
 *
 * Two groups share a module on each side — income+expense → finance, and
 * system_settings+hospital_charges → setup — so the OR runs across groups, not
 * within one. Groups with `module: null` (the five absences in the parity doc,
 * Part II §D) contribute nothing until R4 gives them modules.
 */
export function deriveModulePermissions(featureKeys: FeaturePermissionKey[]): PermissionKey[] {
  const held = new Set<string>(featureKeys);
  const byModule = new Map<ModuleKey, number>();

  for (const group of FEATURE_GROUPS) {
    if (!group.module) continue;
    let mask = byModule.get(group.module) ?? 0;
    for (const f of group.features) {
      for (const a of f.actions) {
        if (held.has(`${f.key}:${a}`)) mask |= ACTION_BITS[a];
      }
    }
    byModule.set(group.module, mask);
  }

  const keys: PermissionKey[] = [];
  for (const [module, mask] of byModule) {
    for (const [action, bit] of Object.entries(ACTION_BITS) as [ActionKey, number][]) {
      if (mask & bit) keys.push(`${module}:${action}`);
    }
  }
  return keys;
}

/** Lightweight ability wrapper — mirrors CASL's `can` for use on the web. */
export class Ability {
  private readonly set: Set<string>;
  private readonly features: Set<string>;

  /**
   * `features` is optional so every existing `new Ability(perms)` call keeps
   * working unchanged. When absent, `canFeature` answers from the module
   * rollup instead — see the method for why that is safe during R1.
   */
  constructor(permissions: PermissionKey[], features: FeaturePermissionKey[] = []) {
    this.set = new Set(permissions);
    this.features = new Set(features);
  }

  /** Build both levels from a role's seeded grants. */
  static forRole(role: RoleKey): Ability {
    const features = featureGrantsFor(role);
    return new Ability(deriveModulePermissions(features), features);
  }

  can(module: ModuleKey, action: ActionKey): boolean {
    return this.set.has(`${module}:${action}`);
  }

  /**
   * The precise check. Falls back to the feature's module when this ability
   * carries no feature set — a token minted before R0.4 has only module keys,
   * and failing those closed would lock out every existing session on deploy.
   * Once R0.4 has run and tokens carry features, the fallback stops firing.
   */
  canFeature(featureKey: string, action: ActionKey): boolean {
    if (this.features.size > 0) return this.features.has(`${featureKey}:${action}`);
    const def = getFeature(featureKey);
    if (!def) return false;
    const module = FEATURE_GROUPS.find((g) => g.key === def.group)?.module;
    return module ? this.can(module, action) : false;
  }

  /** Any action on the module → should it appear in the sidebar. */
  canAccess(module: ModuleKey): boolean {
    return this.can(module, 'view');
  }

  toJSON(): PermissionKey[] {
    return [...this.set] as PermissionKey[];
  }

  /** The feature-level set, for putting on a token. */
  featureKeys(): FeaturePermissionKey[] {
    return [...this.features] as FeaturePermissionKey[];
  }
}
