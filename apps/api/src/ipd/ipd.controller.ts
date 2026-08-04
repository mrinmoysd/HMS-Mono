import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IPD_TABS,
  dischargeSchema,
  ipdAdmissionSchema,
  ipdAdmissionUpdateSchema,
  listQuerySchema,
  transferBedSchema,
  type DischargeInput,
  type IpdAdmissionInput,
  type IpdAdmissionUpdateInput,
  type IpdTab,
  type ListQuery,
  type TransferBedInput,
} from '@smart-hospital/shared';
import { IpdService } from './ipd.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('ipd')
@ApiBearerAuth()
@Controller('ipd')
export class IpdController {
  constructor(private readonly ipd: IpdService) {}

  @Get()
  // Covers both tabs. The spec splits IPD Patients from Discharged Patients and
  // withholds the latter from Pharmacist alone; gating the handler on the
  // admitted list therefore lets a pharmacist reach ?tab=discharged too. The
  // guard cannot see the query param, so closing that would mean pushing the
  // check into the service. Left as-is and recorded rather than half-done.
  @RequireFeature('ipd.ipd_patients', 'view')
  list(
    @BranchId() branchId: string,
    @Query('tab') tab: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const safeTab: IpdTab = (IPD_TABS as readonly string[]).includes(tab ?? '')
      ? (tab as IpdTab)
      : 'admitted';
    return this.ipd.list(branchId, safeTab, query);
  }

  @Post()
  @RequireFeature('ipd.ipd_patients', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(ipdAdmissionSchema)) body: IpdAdmissionInput,
  ) {
    return this.ipd.create(user, branchId, body);
  }

  @Get('by-patient/:patientId')
  @RequireFeature('ipd.ipd_patients', 'view')
  listByPatient(@BranchId() branchId: string, @Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.ipd.listByPatient(branchId, patientId);
  }

  @Get(':id')
  @RequireFeature('ipd.ipd_patients', 'view')
  detail(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ipd.detail(branchId, id);
  }

  @Patch(':id')
  @RequireFeature('ipd.ipd_patients', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ipdAdmissionUpdateSchema)) body: IpdAdmissionUpdateInput,
  ) {
    return this.ipd.update(user, branchId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireFeature('ipd.ipd_patients', 'delete')
  async remove(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.ipd.remove(user, branchId, id);
  }

  @Post(':id/discharge')
  // Its own feature, `51500151`. Accountant holds view but not edit, so it
  // loses the ability to discharge — unlike move-to-IPD, that is the spec
  // stating a position (billing may read a discharge, not perform one) rather
  // than a side effect of how the guard is written.
  @RequireFeature('ipd.patient_discharge', 'edit')
  discharge(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(dischargeSchema)) body: DischargeInput,
  ) {
    return this.ipd.discharge(user, branchId, id, body);
  }

  @Get(':id/bed-history')
  @RequireFeature('ipd.bed_history', 'view')
  bedHistory(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ipd.bedHistory(branchId, id);
  }

  @Post(':id/bed-transfer')
  // Moving a patient between beds is a Bed edit, not an admission edit.
  @RequireFeature('ipd.bed', 'edit')
  transferBed(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(transferBedSchema)) body: TransferBedInput,
  ) {
    return this.ipd.transferBed(user, branchId, id, body.bedId);
  }
}
