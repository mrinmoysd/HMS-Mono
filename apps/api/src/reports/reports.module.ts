import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SettingsModule } from '../settings/settings.module';

// SettingsModule for `GeneralSettingsCache` — every report closes its date
// range in the hospital's timezone rather than the server's.
@Module({
  imports: [SettingsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
