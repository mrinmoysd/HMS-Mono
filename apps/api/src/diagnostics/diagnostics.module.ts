import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DiagnosticsService } from './diagnostics.service';
import { PathologyController } from './pathology.controller';
import { RadiologyController } from './radiology.controller';

@Module({
  imports: [BillingModule],
  controllers: [PathologyController, RadiologyController],
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
