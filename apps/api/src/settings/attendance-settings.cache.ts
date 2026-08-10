import { Injectable } from '@nestjs/common';
import { attendanceSettingSchema, type AttendanceSettingInput } from '@smart-hospital/shared';
import { SettingsService } from './settings.service';

export const ATTENDANCE_SETTING_KEY = 'attendance';

/**
 * The attendance bands, cached per branch.
 *
 * Read on the QR check-in path, which is the one place in this product where a
 * queue of staff hit the same endpoint in the same thirty seconds. Same shape
 * as GeneralSettingsCache and ModuleAccessService: 30s TTL, invalidated on
 * save so a change bites immediately rather than up to a TTL later.
 */
@Injectable()
export class AttendanceSettingsCache {
  private readonly cache = new Map<string, { at: number; value: AttendanceSettingInput }>();
  private static readonly TTL_MS = 30_000;

  constructor(private readonly settings: SettingsService) {}

  async get(branchId: string): Promise<AttendanceSettingInput> {
    const hit = this.cache.get(branchId);
    if (hit && Date.now() - hit.at < AttendanceSettingsCache.TTL_MS) return hit.value;
    const value = await this.settings.get(branchId, ATTENDANCE_SETTING_KEY, attendanceSettingSchema);
    this.cache.set(branchId, { at: Date.now(), value });
    return value;
  }

  invalidate(branchId: string): void {
    this.cache.delete(branchId);
  }
}
