import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { BloodBankController } from './blood-bank.controller';
import { BloodBankService } from './blood-bank.service';

@Module({
  imports: [BillingModule],
  controllers: [BloodBankController],
  providers: [BloodBankService],
})
export class BloodBankModule {}
