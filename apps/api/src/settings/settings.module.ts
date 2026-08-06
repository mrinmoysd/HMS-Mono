import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsCrypto } from './settings.crypto';
import { PrefixService } from './prefix.service';
import { ModuleAccessService } from './module-access.service';

/**
 * `ModuleAccessService` is exported because `PermissionsGuard` — registered as
 * an APP_GUARD in AppModule — depends on it to enforce the Modules on/off
 * setting on every request.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsCrypto, PrefixService, ModuleAccessService],
  exports: [SettingsService, SettingsCrypto, ModuleAccessService],
})
export class SettingsModule {}
