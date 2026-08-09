import { Module } from '@nestjs/common';
import { CommsController } from './comms.controller';
import { CommsService } from './comms.service';
import { SettingsModule } from '../settings/settings.module';

/**
 * SettingsModule supplies ChannelsService: the Messaging screens deliver
 * through the branch's configured SMS/Email gateway rather than a second path
 * with its own idea of which provider is active.
 */
@Module({ imports: [SettingsModule], controllers: [CommsController], providers: [CommsService] })
export class CommsModule {}
