import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { WorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { DutyRosterController } from './duty-roster.controller';
import { DutyRosterService } from './duty-roster.service';

@Module({
  imports: [SettingsModule],
  controllers: [StaffController, WorkforceController, CalendarController, DutyRosterController],
  providers: [StaffService, WorkforceService, CalendarService, DutyRosterService],
})
export class HrModule {}
