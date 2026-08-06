import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsCrypto } from './settings.crypto';
import { PrefixService } from './prefix.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsCrypto, PrefixService],
  exports: [SettingsService, SettingsCrypto],
})
export class SettingsModule {}
