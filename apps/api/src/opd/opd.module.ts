import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { IpdModule } from '../ipd/ipd.module';
import { OpdController } from './opd.controller';
import { OpdService } from './opd.service';

@Module({
  imports: [BillingModule, IpdModule], // shared InvoiceService + IpdService for move-to-ipd
  controllers: [OpdController],
  providers: [OpdService],
})
export class OpdModule {}
