import { Injectable } from '@nestjs/common';
import { generalSettingSchema, GENERAL_SETTING_DEFAULT, type GeneralSettingInput } from '@smart-hospital/shared';
import { SettingsService } from './settings.service';

export const GENERAL_SETTING_KEY = 'general';

/**
 * The branch's General Setting, cached for the request path.
 *
 * Doctor Restriction Mode is consulted on every patient, OPD, IPD and
 * appointment list, so reading the row each time would add a query to the
 * hottest screens in the product. Same shape as ModuleAccessService: short TTL
 * plus explicit invalidation on save, so a single-process deploy sees a change
 * immediately and a multi-process one converges within the TTL.
 */
@Injectable()
export class GeneralSettingsCache {
  private static readonly TTL_MS = 30_000;

  private readonly cache = new Map<string, { value: GeneralSettingInput; expires: number }>();

  constructor(private readonly settings: SettingsService) {}

  async get(branchId: string): Promise<GeneralSettingInput> {
    const hit = this.cache.get(branchId);
    if (hit && hit.expires > Date.now()) return hit.value;

    let value = GENERAL_SETTING_DEFAULT;
    try {
      value = await this.settings.get(branchId, GENERAL_SETTING_KEY, generalSettingSchema);
    } catch {
      // A settings read that fails must not take the patient list down. The
      // defaults have doctorRestrictionMode off, which is the same behaviour
      // the product had before the setting existed.
      value = GENERAL_SETTING_DEFAULT;
    }

    this.cache.set(branchId, { value, expires: Date.now() + GeneralSettingsCache.TTL_MS });
    return value;
  }

  /** True when a doctor should be limited to their own patients. */
  async doctorRestriction(branchId: string): Promise<boolean> {
    return (await this.get(branchId)).doctorRestrictionMode;
  }

  invalidate(branchId: string): void {
    this.cache.delete(branchId);
  }
}
