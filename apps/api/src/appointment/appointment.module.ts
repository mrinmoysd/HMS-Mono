import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentSetupController } from './appointment-setup.controller';
import { AppointmentSetupService } from './appointment-setup.service';

@Module({
  // Setup controller first: its static `/appointments/slots` & `/appointments/doctor-fee`
  // routes must be matched before AppointmentController's `/appointments/:id`.
  controllers: [AppointmentSetupController, AppointmentController],
  providers: [AppointmentService, AppointmentSetupService],
})
export class AppointmentModule {}
