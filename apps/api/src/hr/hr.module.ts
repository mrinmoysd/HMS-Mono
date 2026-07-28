import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { WorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { DutyRosterController } from './duty-roster.controller';
import { DutyRosterService } from './duty-roster.service';

@Module({
  controllers: [StaffController, WorkforceController, CalendarController, DutyRosterController],
  providers: [StaffService, WorkforceService, CalendarService, DutyRosterService],
})
export class HrModule {}
