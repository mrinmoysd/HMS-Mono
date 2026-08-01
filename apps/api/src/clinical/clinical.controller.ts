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
import { RequirePermission } from '../rbac/require-permission.decorator';
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
  @RequirePermission('patient', 'view')
  patientProfile(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.profile(branchId, id);
  }

  // Consolidated Patient Details report (all visits + department bills)
  @Get('patients/:id/report')
  @RequirePermission('patient', 'view')
  patientReport(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.report(branchId, id);
  }

  // Vital types (Setup master)
  @Get('vital-types')
  @RequirePermission('patient', 'view')
  listVitalTypes(@BranchId() b: string) {
    return this.vitalTypes.list(b);
  }
  @Post('vital-types')
  @RequirePermission('setup', 'add')
  createVitalType(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(vitalTypeSchema)) body: VitalTypeInput) {
    return this.vitalTypes.create(u, b, body);
  }

  // Finding catalog (Setup master)
  @Get('findings')
  @RequirePermission('patient', 'view')
  listFindingMasters(@BranchId() b: string) {
    return this.clinical.listFindings(b);
  }
  @Post('findings')
  @RequirePermission('setup', 'add')
  createFindingMaster(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(findingSchema)) body: FindingInput) {
    return this.clinical.createFinding(u, b, body);
  }

  // Symptom-type catalog (Setup master)
  @Get('symptom-types')
  @RequirePermission('patient', 'view')
  listSymptomTypeMasters(@BranchId() b: string) {
    return this.clinical.listSymptomTypes(b);
  }
  @Post('symptom-types')
  @RequirePermission('setup', 'add')
  createSymptomTypeMaster(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(symptomTypeSchema)) body: SymptomTypeInput) {
    return this.clinical.createSymptomType(u, b, body);
  }

  // ICD-10 code catalog (Setup master). Groups come from the generic
  // name-catalog under 'icd-group'.
  @Get('icd-codes')
  @RequirePermission('patient', 'view')
  listIcdCodes(@BranchId() b: string) {
    return this.clinical.listIcdCodes(b);
  }
  @Post('icd-codes')
  @RequirePermission('setup', 'add')
  createIcdCode(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(icdCodeSchema)) body: IcdCodeInput) {
    return this.clinical.createIcdCode(u, b, body);
  }
  @Patch('icd-codes/:id')
  @RequirePermission('setup', 'edit')
  updateIcdCode(
    @CurrentUser() u: RequestUser,
    @BranchId() b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(icdCodeSchema)) body: IcdCodeInput,
  ) {
    return this.clinical.updateIcdCode(u, b, id, body);
  }
  @Delete('icd-codes/:id')
  @RequirePermission('setup', 'delete')
  @HttpCode(204)
  async removeIcdCode(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeIcdCode(u, b, id);
  }

  // Vitals
  @Get('clinical/vitals/current')
  @RequirePermission('patient', 'view')
  currentVitals(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.currentVitals(b, patientId);
  }
  @Get('clinical/vitals/matrix')
  @RequirePermission('patient', 'view')
  vitalMatrix(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.vitalMatrix(b, patientId);
  }
  @Post('clinical/vitals')
  @RequirePermission('patient', 'edit')
  addVitals(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addVitalsSchema)) body: AddVitalsInput) {
    return this.clinical.addVitals(u, b, body);
  }
  @Patch('clinical/vitals/:id')
  @RequirePermission('patient', 'edit')
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
  @RequirePermission('patient', 'delete')
  async removeVital(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeVital(u, b, id);
  }

  // Findings
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
  @RequirePermission('patient', 'view')
  listTimeline(@BranchId() b: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.clinical.listTimeline(b, patientId);
  }
  @Post('clinical/timeline')
  @RequirePermission('patient', 'edit')
  addTimeline(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(timelineEntrySchema)) body: TimelineEntryInput) {
    return this.clinical.addTimeline(u, b, body);
  }
  @Patch('clinical/timeline/:id')
  @RequirePermission('patient', 'edit')
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
  @RequirePermission('patient', 'delete')
  async removeTimeline(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.clinical.removeTimeline(u, b, id);
  }
}
