import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addFindingRecordSchema,
  addSymptomRecordSchema,
  addVitalsSchema,
  findingSchema,
  icdCodeSchema,
  symptomTypeSchema,
  timelineEntrySchema,
  updateTimelineSchema,
  updateVitalSchema,
  vitalTypeSchema,
  type AddFindingRecordInput,
  type AddSymptomRecordInput,
  type AddVitalsInput,
  type FindingInput,
  type IcdCodeInput,
  type SymptomTypeInput,
  type TimelineEntryInput,
  type UpdateTimelineInput,
  type UpdateVitalInput,
  type VitalTypeInput,
} from '@smart-hospital/shared';
import { ClinicalService } from './clinical.service';
import { VitalTypeService } from './vital-type.service';
import { ProfileService } from './profile.service';
import { RequireFeature, RequireFeatureFor } from '../rbac/require-feature.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { ENCOUNTER_FEATURES as EF, encounterFeature } from './clinical-features';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('clinical')
@ApiBearerAuth()
@Controller()
export class ClinicalController {
  constructor(
    private readonly clinical: ClinicalService,
    private readonly vitalTypes: VitalTypeService,
    private readonly profile: ProfileService,
  ) {}

  // Patient 360 aggregation
  @Get('patients/:id/profile')
  @RequireFeature('patient.patient', 'view')
  patientProfile(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.profile(branchId, id);
  }

  // Consolidated Patient Details report (all visits + department bills)
  @Get('patients/:id/report')
  @RequireFeature('patient.patient', 'view')
  patientReport(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.report(branchId, id);
  }

  // Vital types (Setup master)
  // The clinical masters are System Settings features in the spec, not a
  // by-product of patient access.
  @Get('vital-types')
  @RequireFeature('system_settings.vital', 'view')
  listVitalTypes(@BranchId() b: string) {
    return this.vitalTypes.list(b);
  }
  @Post('vital-types')
  @RequireFeature('system_settings.vital', 'add')
  createVitalType(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(vitalTypeSchema)) body: VitalTypeInput) {
    return this.vitalTypes.create(u, b, body);
  }

  // Finding catalog (Setup master)
  @Get('findings')
  @RequireFeature('system_settings.findings', 'view')
  listFindingMasters(@BranchId() b: string) {
    return this.clinical.listFindings(b);
  }
  @Post('findings')
  @RequireFeature('system_settings.findings', 'add')
  createFindingMaster(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(findingSchema)) body: FindingInput) {
    return this.clinical.createFinding(u, b, body);
  }

  // Symptom-type catalog (Setup master)
  @Get('symptom-types')
  @RequireFeature('system_settings.symptoms_type', 'view')
  listSymptomTypeMasters(@BranchId() b: string) {
    return this.clinical.listSymptomTypes(b);
  }
  @Post('symptom-types')
  @RequireFeature('system_settings.symptoms_type', 'add')
  createSymptomTypeMaster(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(symptomTypeSchema)) body: SymptomTypeInput) {
    return this.clinical.createSymptomType(u, b, body);
  }

  // ICD-10 code catalog (Setup master). Groups come from the generic
  // name-catalog under 'icd-group'.
  @Get('icd-codes')
  @RequireFeature('system_settings.icd_10_codes', 'view')
  listIcdCodes(@BranchId() b: string) {
    return this.clinical.listIcdCodes(b);
  }
  @Post('icd-codes')
  @RequireFeature('system_settings.icd_10_codes', 'add')
  createIcdCode(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(icdCodeSchema)) body: IcdCodeInput) {
    return this.clinical.createIcdCode(u, b, body);
  }
  @Patch('icd-codes/:id')
  @RequireFeature('system_settings.icd_10_codes', 'edit')
  updateIcdCode(
    @CurrentUser() u: RequestUser,
    @BranchId() b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(icdCodeSchema)) body: IcdCodeInput,
  ) {
    return this.clinical.updateIcdCode(u, b, id, body);
  }
  @Delete('icd-codes/:id')
  @RequireFeature('system_settings.icd_10_codes', 'delete')
  @HttpCode(204)
  async removeIcdCode(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeIcdCode(u, b, id);
  }

  // Vitals
  @Get('clinical/vitals/current')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.vitals, 'view'))
  currentVitals(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.currentVitals(b, patientId);
  }
  @Get('clinical/vitals/matrix')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.vitals, 'view'))
  vitalMatrix(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.vitalMatrix(b, patientId);
  }
  @Post('clinical/vitals')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.vitals, 'add'))
  addVitals(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addVitalsSchema)) body: AddVitalsInput) {
    return this.clinical.addVitals(u, b, body);
  }
  @Patch('clinical/vitals/:id')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.vitals, 'edit'))
  updateVital(
    @CurrentUser() u: RequestUser,
    @BranchId() b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateVitalSchema)) body: UpdateVitalInput,
  ) {
    return this.clinical.updateVital(u, b, id, body);
  }
  @Delete('clinical/vitals/:id')
  @HttpCode(204)
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.vitals, 'delete'))
  async removeVital(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeVital(u, b, id);
  }

  // Findings
  // clinical/findings and clinical/symptoms record annotations against a
  // patient. The spec has Findings and Symptoms Type only as System Settings
  // *masters*, with no feature for the recorded values, so these two pairs stay
  // module-level rather than being bent onto a master's key.
  @Get('clinical/findings')
  @RequirePermission('patient', 'view')
  listFindings(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.listFindingRecords(b, patientId);
  }
  @Post('clinical/findings')
  @RequirePermission('patient', 'edit')
  addFinding(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addFindingRecordSchema)) body: AddFindingRecordInput) {
    return this.clinical.addFindingRecord(u, b, body);
  }

  // Symptoms
  @Get('clinical/symptoms')
  @RequirePermission('patient', 'view')
  listSymptoms(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.listSymptomRecords(b, patientId);
  }
  @Post('clinical/symptoms')
  @RequirePermission('patient', 'edit')
  addSymptom(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addSymptomRecordSchema)) body: AddSymptomRecordInput) {
    return this.clinical.addSymptomRecord(u, b, body);
  }

  // Timeline
  @Get('clinical/timeline')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.timeline, 'view'))
  listTimeline(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.listTimeline(b, patientId);
  }
  @Post('clinical/timeline')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.timeline, 'add'))
  addTimeline(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(timelineEntrySchema)) body: TimelineEntryInput) {
    return this.clinical.addTimeline(u, b, body);
  }
  @Patch('clinical/timeline/:id')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.timeline, 'edit'))
  updateTimeline(
    @CurrentUser() u: RequestUser,
    @BranchId() b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTimelineSchema)) body: UpdateTimelineInput,
  ) {
    return this.clinical.updateTimeline(u, b, id, body);
  }
  @Delete('clinical/timeline/:id')
  @HttpCode(204)
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.timeline, 'delete'))
  async removeTimeline(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeTimeline(u, b, id);
  }
}
