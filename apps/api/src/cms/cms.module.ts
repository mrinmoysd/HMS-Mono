import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { SettingsModule } from '../settings/settings.module';

// SettingsModule for the Front CMS setting: whether the public site answers
// at all, and the identity it answers with.
@Module({
  imports: [SettingsModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
