import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  generalSettingSchema,
  prefixUpdateSchema,
  PREFIX_FIELDS,
  type GeneralSettingInput,
  type PrefixUpdateInput,
} from '@smart-hospital/shared';
import { SettingsService } from './settings.service';
import { PrefixService } from './prefix.service';
import { SETTINGS_NAV } from './settings.nav';
import { RequireRole } from '../rbac/require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

export const GENERAL_SETTING_KEY = 'general';

/**
 * Setup ▸ Settings (parity plan, phase G0/G1/G2).
 *
 * Role-gated to Admin and Super Admin, the same call and for the same reason as
 * the permission editor: several of these screens configure who can do what and
 * hold the credentials that move money, so gating them on a permission that the
 * permission editor can revoke closes a loop. See require-role.decorator.ts.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly prefixes: PrefixService,
  ) {}

  /** The rail, plus whether credential storage is usable on this deployment. */
  @Get()
  @RequireRole('super_admin', 'admin')
  overview() {
    return { nav: SETTINGS_NAV, secretsConfigured: this.settings.secretsConfigured() };
  }

  @Get('general')
  @RequireRole('super_admin', 'admin')
  getGeneral(@BranchId() branchId: string) {
    return this.settings.get(branchId, GENERAL_SETTING_KEY, generalSettingSchema);
  }

  @Put('general')
  @RequireRole('super_admin', 'admin')
  setGeneral(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(generalSettingSchema)) body: GeneralSettingInput,
  ) {
    return this.settings.set(user, GENERAL_SETTING_KEY, generalSettingSchema, body);
  }

  /**
   * Prefixes are not stored in `setting` — they live on SequenceCounter, which
   * already drives every generated number. This is a UI over that.
   */
  @Get('prefixes')
  @RequireRole('super_admin', 'admin')
  getPrefixes(@BranchId() branchId: string) {
    return this.prefixes.list(branchId);
  }

  @Put('prefixes')
  @RequireRole('super_admin', 'admin')
  setPrefixes(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(prefixUpdateSchema)) body: PrefixUpdateInput,
  ) {
    return this.prefixes.update(user, body);
  }
}

/** Exported for the test that asserts the rail and the field list agree. */
export const PREFIX_KEYS = PREFIX_FIELDS.map((f) => f.key);
