import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { EncounterBillingController } from './encounter-billing.controller';
import { InvoiceService } from './invoice.service';
import { EncounterBillingService } from './encounter-billing.service';

@Module({
  controllers: [BillingController, EncounterBillingController],
  providers: [InvoiceService, EncounterBillingService],
  exports: [InvoiceService],
})
export class BillingModule {}
