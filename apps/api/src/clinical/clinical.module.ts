import { Module } from '@nestjs/common';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { VitalTypeService } from './vital-type.service';
import { ProfileService } from './profile.service';
import { DiagnosticsClinicalController } from './diagnostics-clinical.controller';
import { DiagnosticsClinicalService } from './diagnostics-clinical.service';
import { OperationsClinicalController } from './operations-clinical.controller';
import { OperationsClinicalService } from './operations-clinical.service';
import { IpdClinicalController } from './ipd-clinical.controller';
import { IpdClinicalService } from './ipd-clinical.service';

@Module({
  controllers: [ClinicalController, DiagnosticsClinicalController, OperationsClinicalController, IpdClinicalController],
  providers: [ClinicalService, VitalTypeService, ProfileService, DiagnosticsClinicalService, OperationsClinicalService, IpdClinicalService],
})
export class ClinicalModule {}
