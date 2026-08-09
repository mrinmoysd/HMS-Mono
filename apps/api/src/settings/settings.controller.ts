import { Body, Controller, Get, NotFoundException, Param, Post, Put, UnprocessableEntityException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  generalSettingSchema,
  moduleSettingSchema,
  notificationSettingSchema,
  systemNotificationSettingSchema,
  prefixUpdateSchema,
  channelSettingSchema,
  channelTestSchema,
  paymentSettingSchema,
  isChannel,
  sanitiseDisabled,
  unknownPlaceholders,
  CHANNEL_META,
  MODULE_TOGGLES,
  NOTIFICATION_EVENTS,
  SYSTEM_NOTIFICATION_EVENTS,
  PREFIX_FIELDS,
  type GeneralSettingInput,
  type ModuleSettingInput,
  type ModuleStateDto,
  type NotificationSettingInput,
  type SystemNotificationSettingInput,
  type PrefixUpdateInput,
  type Channel,
  type ChannelSettingInput,
  type ChannelTestInput,
  type PaymentSettingInput,
} from '@smart-hospital/shared';
import { SettingsService } from './settings.service';
import { PrefixService } from './prefix.service';
import { SETTINGS_NAV } from './settings.nav';
import { ModuleAccessService, MODULE_SETTING_KEY } from './module-access.service';
import { GeneralSettingsCache } from './general-settings.cache';
import { ChannelsService } from './channels/channels.service';
import { PaymentsService } from './payments/payments.service';
import { RequireRole } from '../rbac/require-role.decorator';
import { Authenticated } from '../rbac/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

export const GENERAL_SETTING_KEY = 'general';
export const NOTIFICATION_KEY = 'notifications';
export const SYSTEM_NOTIFICATION_KEY = 'system_notifications';

/**
 * Refuse a template whose placeholders its event cannot supply.
 *
 * Validated on the server, not only in the screen: a `{{patinet_name}}` typo
 * saved here would later render as a hole in an SMS to a patient, and nothing
 * downstream would notice. Failing the save is the last moment anyone is
 * looking.
 */
function assertTemplatesResolvable(
  events: Record<string, { subject?: string; body?: string }>,
  catalogue: readonly { key: string; placeholders: readonly string[] }[],
): void {
  const byKey = new Map(catalogue.map((e) => [e.key, e.placeholders]));
  const problems: string[] = [];
  for (const [key, cfg] of Object.entries(events)) {
    const allowed = byKey.get(key);
    if (!allowed) {
      problems.push(`${key}: unknown event`);
      continue;
    }
    for (const field of ['subject', 'body'] as const) {
      const bad = unknownPlaceholders(cfg[field] ?? '', allowed);
      if (bad.length) problems.push(`${key} ${field}: ${bad.map((b) => `{{${b}}}`).join(', ')}`);
    }
  }
  if (problems.length) {
    throw new UnprocessableEntityException(`Unknown placeholders — ${problems.join(' · ')}`);
  }
}

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
    private readonly moduleAccess: ModuleAccessService,
    private readonly generalCache: GeneralSettingsCache,
    private readonly channels: ChannelsService,
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
  async setGeneral(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(generalSettingSchema)) body: GeneralSettingInput,
  ) {
    const saved = await this.settings.set(user, GENERAL_SETTING_KEY, generalSettingSchema, body);
    // Doctor Restriction Mode gates the patient/OPD/IPD lists, so a change has
    // to bite on the next request rather than up to a TTL later.
    this.generalCache.invalidate(branchId);
    return saved;
  }

  /** The Modules screen: which modules are switched off for this branch. */
  @Get('modules')
  @RequireRole('super_admin', 'admin')
  async getModules(@BranchId() branchId: string) {
    const value = await this.settings.get(branchId, MODULE_SETTING_KEY, moduleSettingSchema);
    return { rows: MODULE_TOGGLES, disabled: sanitiseDisabled(value.disabled) };
  }

  @Put('modules')
  @RequireRole('super_admin', 'admin')
  async setModules(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(moduleSettingSchema)) body: ModuleSettingInput,
  ) {
    const saved = await this.settings.set(user, MODULE_SETTING_KEY, moduleSettingSchema, body);
    // Drop the guard's cache so the change applies to the very next request
    // rather than up to a TTL later.
    this.moduleAccess.invalidate(branchId);
    return { rows: MODULE_TOGGLES, disabled: sanitiseDisabled(saved.disabled) };
  }

  /**
   * The disabled set, for the sidebar.
   *
   * Separate from GET /settings/modules because every signed-in user needs it
   * to render their navigation, and almost none of them may open Settings.
   * It exposes only which modules are off — the same thing the sidebar would
   * reveal anyway — so `@Authenticated` is the right gate.
   */
  @Get('modules/state')
  @Authenticated()
  async moduleState(@BranchId() branchId: string): Promise<ModuleStateDto> {
    const value = await this.settings.get(branchId, MODULE_SETTING_KEY, moduleSettingSchema);
    return { disabled: sanitiseDisabled(value.disabled) };
  }

  /**
   * Notification Setting — user-facing events × channels, plus templates.
   *
   * The event catalogue ships with the response rather than being fetched
   * separately: the screen cannot render a row without knowing which
   * placeholders that event supplies, and splitting them would let the two
   * drift.
   */
  @Get('notifications')
  @RequireRole('super_admin', 'admin')
  async getNotifications(@BranchId() branchId: string) {
    const value = await this.settings.get(branchId, NOTIFICATION_KEY, notificationSettingSchema);
    return { events: NOTIFICATION_EVENTS, config: value.events };
  }

  @Put('notifications')
  @RequireRole('super_admin', 'admin')
  async setNotifications(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(notificationSettingSchema)) body: NotificationSettingInput,
  ) {
    assertTemplatesResolvable(body.events, NOTIFICATION_EVENTS);
    const saved = await this.settings.set(user, NOTIFICATION_KEY, notificationSettingSchema, body);
    return { events: NOTIFICATION_EVENTS, config: saved.events };
  }

  /** System Notification Setting — internal events with Staff/Patient toggles. */
  @Get('system-notifications')
  @RequireRole('super_admin', 'admin')
  async getSystemNotifications(@BranchId() branchId: string) {
    const value = await this.settings.get(branchId, SYSTEM_NOTIFICATION_KEY, systemNotificationSettingSchema);
    return { events: SYSTEM_NOTIFICATION_EVENTS, config: value.events };
  }

  @Put('system-notifications')
  @RequireRole('super_admin', 'admin')
  async setSystemNotifications(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(systemNotificationSettingSchema)) body: SystemNotificationSettingInput,
  ) {
    assertTemplatesResolvable(body.events, SYSTEM_NOTIFICATION_EVENTS);
    const saved = await this.settings.set(user, SYSTEM_NOTIFICATION_KEY, systemNotificationSettingSchema, body);
    return { events: SYSTEM_NOTIFICATION_EVENTS, config: saved.events };
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

  // ── Channels: SMS / WhatsApp / Email ────────────────────────────────

  /**
   * Credentials come back masked, never in the clear — see ChannelsService.
   * There is no reveal endpoint by design.
   */
  @Get('channels/:channel')
  @RequireRole('super_admin', 'admin')
  getChannel(@BranchId() branchId: string, @Param('channel') channel: string) {
    return this.channels.view(branchId, assertChannel(channel));
  }

  @Put('channels/:channel')
  @RequireRole('super_admin', 'admin')
  setChannel(
    @CurrentUser() user: RequestUser,
    @Param('channel') channel: string,
    @Body(new ZodValidationPipe(channelSettingSchema)) body: ChannelSettingInput,
  ) {
    return this.channels.save(user, assertChannel(channel), body);
  }

  /**
   * Send one real message through the active provider.
   *
   * The only honest way to know a gateway works: credentials that parse, an
   * account that is funded, and a sender the carrier has actually approved are
   * three different things, and only a delivered message proves all three. It
   * uses the same code path as production sending, so a pass here means the
   * next appointment reminder goes out too.
   */
  @Post('channels/:channel/test')
  @RequireRole('super_admin', 'admin')
  testChannel(
    @BranchId() branchId: string,
    @Param('channel') channel: string,
    @Body(new ZodValidationPipe(channelTestSchema)) body: ChannelTestInput,
  ) {
    const ch = assertChannel(channel);
    return this.channels.send(branchId, ch, {
      to: body.to,
      body: body.message,
      subject: `Test message from ${CHANNEL_META[ch].label.replace(' Setting', '')}`,
    });
  }
}

/** Payment Methods — the online gateways, their credentials and their fees. */
@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequireRole('super_admin', 'admin')
  get(@BranchId() branchId: string) {
    return this.payments.view(branchId);
  }

  @Put()
  @RequireRole('super_admin', 'admin')
  set(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(paymentSettingSchema)) body: PaymentSettingInput,
  ) {
    return this.payments.save(user, body);
  }
}

/** A path segment is user input; only the three real channels get through. */
function assertChannel(value: string): Channel {
  if (!isChannel(value)) throw new NotFoundException(`Unknown channel: ${value}`);
  return value;
}

/** Exported for the test that asserts the rail and the field list agree. */
export const PREFIX_KEYS = PREFIX_FIELDS.map((f) => f.key);
