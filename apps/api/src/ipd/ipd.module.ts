import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { IpdController } from './ipd.controller';
import { IpdService } from './ipd.service';

@Module({
  imports: [BillingModule], // shared InvoiceService
  controllers: [IpdController],
  providers: [IpdService],
  exports: [IpdService], // for OpdService.moveToIpd()
})
export class IpdModule {}
