import { FEATURE_GROUPS, type FeatureGroupKey } from './features';
import type { ModuleKey } from './modules';

/**
 * Modules on/off (Settings parity plan, phase G3).
 *
 * ── Why the toggle unit is the feature group, not ModuleKey ──────────────────
 * `PermissionsGuard` decides access from feature keys like `opd.opd_patient`,
 * whose prefix is the feature group. Making the toggle anything else would mean
 * translating at enforcement time, and a translation table is exactly where a
 * disabled module quietly stays reachable. So the switch is the group: 36 of
 * them, which is also what the reference's "System" tab lists.
 *
 * Two modules own more than one group — `finance` is income + expense, `setup`
 * is system_settings + hospital_charges — so the sidebar's ModuleKey view has to
 * ask about all of a module's groups. `sidebarModuleEnabled` does that.
 *
 * ── Why the stored value is the DISABLED list ────────────────────────────────
 * Storing what is off, rather than what is on, means a module added in a later
 * release is enabled by default. Store the enabled list instead and every new
 * module ships invisible until someone notices — a silent failure that looks
 * exactly like a bug in the new feature.
 */

/** The unit the Modules screen toggles and the guard enforces. */
export type ModuleToggleKey = FeatureGroupKey;

/**
 * Modules that cannot be turned off, and why each one would be a trap.
 *
 * `system_settings` holds the Modules screen itself. Disabling it removes the
 * only route that could re-enable anything — the same revocation loop that
 * keeps the permission editor role-gated rather than permission-gated (see
 * require-role.decorator.ts).
 *
 * `dashboard` is where `/` and the post-login redirect both land. Disabling it
 * strands every user on a denied page the moment they sign in, including the
 * admin who just did it.
 *
 * Neither is a policy preference — both are lockouts, so the API rejects them
 * rather than trusting the client to hide the switch.
 */
export const PROTECTED_MODULES = ['system_settings', 'dashboard'] as const satisfies readonly ModuleToggleKey[];

export type ProtectedModuleKey = (typeof PROTECTED_MODULES)[number];

/**
 * Groups with no module behind them yet — parity phase R4. They carry
 * `module: null` in FEATURE_GROUPS, so this derives rather than duplicates.
 *
 * They are listed on the screen and labelled, not hidden: the Modules list is
 * meant to be an honest inventory of what the product has, and a silent gap
 * reads as "we forgot" rather than "not built yet".
 */
export const UNBUILT_MODULES: readonly ModuleToggleKey[] = FEATURE_GROUPS.filter(
  (g) => g.module === null,
).map((g) => g.key);

/** One row of the Modules screen. */
export interface ModuleToggleRow {
  key: ModuleToggleKey;
  label: string;
  /** The sidebar module this group hangs under; null when nothing is built. */
  module: ModuleKey | null;
  /** False when the row renders read-only — protected or not yet built. */
  toggleable: boolean;
  /** Populated when `toggleable` is false, so the UI never invents a reason. */
  reason: 'protected' | 'coming_soon' | null;
}

export const MODULE_TOGGLES: readonly ModuleToggleRow[] = FEATURE_GROUPS.map((g) => {
  const protectedModule = (PROTECTED_MODULES as readonly string[]).includes(g.key);
  const unbuilt = g.module === null;
  return {
    key: g.key,
    label: g.label,
    module: g.module,
    toggleable: !protectedModule && !unbuilt,
    reason: protectedModule ? 'protected' : unbuilt ? 'coming_soon' : null,
  };
});

const TOGGLEABLE = new Set<string>(MODULE_TOGGLES.filter((r) => r.toggleable).map((r) => r.key));

/** True when `key` names a module an admin is allowed to switch off. */
export function isToggleableModule(key: string): key is ModuleToggleKey {
  return TOGGLEABLE.has(key);
}

/**
 * The module a feature key belongs to — the part before the first dot.
 *
 * Feature keys are `group.feature` by construction (features.ts builds them
 * that way), so this is a parse, not a lookup table that could drift.
 */
export function moduleOfFeature(featureKey: string): ModuleToggleKey {
  const dot = featureKey.indexOf('.');
  return (dot === -1 ? featureKey : featureKey.slice(0, dot)) as ModuleToggleKey;
}

const GROUPS_BY_MODULE = new Map<ModuleKey, ModuleToggleKey[]>();
for (const g of FEATURE_GROUPS) {
  if (!g.module) continue;
  const list = GROUPS_BY_MODULE.get(g.module) ?? [];
  list.push(g.key);
  GROUPS_BY_MODULE.set(g.module, list);
}

/**
 * The toggle groups belonging to a sidebar module.
 *
 * Used for the legacy `@RequirePermission(module, action)` routes, which name a
 * ModuleKey rather than a feature, and for the sidebar.
 */
export function togglesForModule(module: ModuleKey): readonly ModuleToggleKey[] {
  return GROUPS_BY_MODULE.get(module) ?? [];
}

/** True when the module is on. An unknown key is treated as on, never off. */
export function moduleEnabled(disabled: readonly string[], key: string): boolean {
  return !disabled.includes(key);
}

/**
 * Whether a sidebar module should be shown.
 *
 * A module with several groups stays visible while any one of them is on:
 * turning off Income should not take the whole Finance section away while
 * Expense is still enabled.
 */
export function sidebarModuleEnabled(disabled: readonly string[], module: ModuleKey): boolean {
  const groups = togglesForModule(module);
  if (groups.length === 0) return true;
  return groups.some((g) => moduleEnabled(disabled, g));
}

/**
 * Normalise a stored disabled list: drop anything unknown or not toggleable.
 *
 * A protected key that reached storage — an older build, a hand-edited row —
 * must not be honoured, or the lockout it exists to prevent happens anyway.
 */
export function sanitiseDisabled(disabled: readonly string[]): ModuleToggleKey[] {
  return [...new Set(disabled)].filter(isToggleableModule);
}
