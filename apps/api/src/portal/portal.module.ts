import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PatientPanelGuard } from './patient-panel.guard';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule, AuthModule, BillingModule],
  controllers: [PortalController],
  providers: [PatientPanelGuard, PortalService],
})
export class PortalModule {}
