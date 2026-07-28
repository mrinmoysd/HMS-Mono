import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AmbulanceController } from './ambulance.controller';
import { AmbulanceService } from './ambulance.service';

@Module({
  imports: [BillingModule],
  controllers: [AmbulanceController],
  providers: [AmbulanceService],
})
export class AmbulanceModule {}
