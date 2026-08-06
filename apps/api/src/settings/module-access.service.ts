import { Injectable } from '@nestjs/common';
import { moduleSettingSchema, sanitiseDisabled } from '@smart-hospital/shared';
import { SettingsService } from './settings.service';

export const MODULE_SETTING_KEY = 'modules';

/**
 * Which modules are switched off, for the permission guard (parity plan, G3).
 *
 * `PermissionsGuard` consults this on **every** authenticated request, so an
 * uncached database read here would add one query to every call in the product.
 * The cache is per branch with a short TTL, and is dropped explicitly when the
 * Modules screen saves.
 *
 * The TTL matters even though we invalidate on write: with more than one API
 * process, a save in one process cannot clear another's map. Thirty seconds
 * bounds how long a disabled module stays reachable on a sibling process, and
 * bounds the query rate to twice a minute per branch. Invalidation makes the
 * common single-process case instant; the TTL is the safety net.
 */
@Injectable()
export class ModuleAccessService {
  /** Longer would leave a just-disabled module reachable for too long. */
  private static readonly TTL_MS = 30_000;

  private readonly cache = new Map<string, { disabled: Set<string>; expires: number }>();

  constructor(private readonly settings: SettingsService) {}

  /** The disabled set for a branch, cached. Never throws — a read failure means "nothing disabled". */
  async disabledFor(branchId: string): Promise<Set<string>> {
    const hit = this.cache.get(branchId);
    if (hit && hit.expires > Date.now()) return hit.disabled;

    let disabled = new Set<string>();
    try {
      const value = await this.settings.get(branchId, MODULE_SETTING_KEY, moduleSettingSchema);
      // sanitiseDisabled drops protected keys, so a row written by an older
      // build (or by hand) can never disable Settings and lock the branch out.
      disabled = new Set(sanitiseDisabled(value.disabled));
    } catch {
      // Failing open here is deliberate. This gate is a configuration
      // preference, not an authorisation boundary — the feature check still
      // runs immediately after. Failing closed on a transient database error
      // would take the whole product offline to enforce a settings toggle.
      disabled = new Set<string>();
    }

    this.cache.set(branchId, { disabled, expires: Date.now() + ModuleAccessService.TTL_MS });
    return disabled;
  }

  /** True when the module is switched off for this branch. */
  async isDisabled(branchId: string, moduleKey: string): Promise<boolean> {
    return (await this.disabledFor(branchId)).has(moduleKey);
  }

  /** Called by the Modules screen on save so the change lands immediately. */
  invalidate(branchId: string): void {
    this.cache.delete(branchId);
  }
}
