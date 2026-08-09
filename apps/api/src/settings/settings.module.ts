import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsCrypto } from './settings.crypto';
import { PrefixService } from './prefix.service';
import { ModuleAccessService } from './module-access.service';
import { GeneralSettingsCache } from './general-settings.cache';
import { ChannelsService } from './channels/channels.service';

/**
 * `ModuleAccessService` is exported because `PermissionsGuard` — registered as
 * an APP_GUARD in AppModule — depends on it to enforce the Modules on/off
 * setting on every request.
 *
 * `ChannelsService` is exported because CommsModule sends through it: the
 * Messaging screens must deliver via the same configured gateway as everything
 * else, not a second path with its own idea of which provider is active.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsCrypto, PrefixService, ModuleAccessService, GeneralSettingsCache, ChannelsService],
  exports: [SettingsService, SettingsCrypto, ModuleAccessService, GeneralSettingsCache, ChannelsService],
})
export class SettingsModule {}
