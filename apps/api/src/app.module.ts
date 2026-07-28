import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { z } from 'zod';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './common/audit/audit.module';
import { SequenceModule } from './common/sequence/sequence.module';
import { PatientModule } from './patient/patient.module';
import { TpaModule } from './tpa/tpa.module';
import { MastersModule } from './masters/masters.module';
import { CustomFieldModule } from './custom-field/custom-field.module';
import { CertificateModule } from './certificate/certificate.module';
import { BillingModule } from './billing/billing.module';
import { AppointmentModule } from './appointment/appointment.module';
import { OpdModule } from './opd/opd.module';
import { IpdModule } from './ipd/ipd.module';
import { BedsModule } from './beds/beds.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { BloodBankModule } from './blood-bank/blood-bank.module';
import { OperationModule } from './operation/operation.module';
import { FinanceModule } from './finance/finance.module';
import { ReferralModule } from './referral/referral.module';
import { AmbulanceModule } from './ambulance/ambulance.module';
import { HrModule } from './hr/hr.module';
import { FrontOfficeModule } from './front-office/front-office.module';
import { RecordsModule } from './records/records.module';
import { CommsModule } from './comms/comms.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { MultiBranchModule } from './multibranch/multibranch.module';
import { CmsModule } from './cms/cms.module';
import { PortalModule } from './portal/portal.module';
import { ClinicalModule } from './clinical/clinical.module';
import { DirectoryModule } from './directory/directory.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';
import { BranchContextInterceptor } from './common/context/branch-context.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';
import { MetaController } from './meta/meta.controller';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL: z.string().default('900s'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    PrismaModule,
    RbacModule,
    AuditModule,
    SequenceModule,
    AuthModule,
    PatientModule,
    TpaModule,
    MastersModule,
    CustomFieldModule,
    CertificateModule,
    BillingModule,
    AppointmentModule,
    OpdModule,
    IpdModule,
    BedsModule,
    PharmacyModule,
    DiagnosticsModule,
    BloodBankModule,
    OperationModule,
    FinanceModule,
    ReferralModule,
    AmbulanceModule,
    HrModule,
    FrontOfficeModule,
    RecordsModule,
    CommsModule,
    InventoryModule,
    ReportsModule,
    MultiBranchModule,
    CmsModule,
    PortalModule,
    ClinicalModule,
    DirectoryModule,
  ],
  controllers: [HealthController, MetaController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Order matters: authenticate → resolve branch → check permission.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: BranchContextInterceptor },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
