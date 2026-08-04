import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  OPD_TABS,
  listQuerySchema,
  moveToIpdSchema,
  opdCheckupSchema,
  opdVisitSchema,
  opdVisitUpdateSchema,
  type ListQuery,
  type OpdCheckupInput,
  type MoveToIpdInput,
  type OpdTab,
  type OpdVisitInput,
  type OpdVisitUpdateInput,
} from '@smart-hospital/shared';
import { OpdService } from './opd.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

/**
 * Migrated to feature-level permissions (R1, first module).
 *
 * Each handler now names the blueprint feature it actually is, instead of the
 * whole `opd` module. What that changes, per docs/ROLE_PERMISSION_PARITY.md §6:
 *
 *   Doctor and Receptionist GAIN delete on OPD Patient, Visit and Checkup —
 *     the spec grants `f` there; our module matrix withheld delete from everyone
 *     but Admin.
 *   Pharmacist, Pathologist and Radiologist LOSE add and edit. The spec gives
 *     them 1, 3 and 4 OPD features respectively, all read-only; our module
 *     matrix handed them the whole of OPD because they needed to see it.
 *   Nurse is unchanged on the encounter (view only) but keeps checkup:view.
 *
 * These are the intended corrections, not incidental. The module-level matrix
 * could not express any of them.
 */
@ApiTags('opd')
@ApiBearerAuth()
@Controller('opd')
export class OpdController {
  constructor(private readonly opd: OpdService) {}

  @Get()
  @RequireFeature('opd.opd_patient', 'view')
  list(
    @BranchId() branchId: string,
    @Query('tab') tab: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const safeTab: OpdTab = (OPD_TABS as readonly string[]).includes(tab ?? '')
      ? (tab as OpdTab)
      : 'today';
    return this.opd.list(branchId, safeTab, query);
  }

  @Post()
  @RequireFeature('opd.opd_patient', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(opdVisitSchema)) body: OpdVisitInput,
  ) {
    return this.opd.create(user, branchId, body);
  }

  /**
   * Must precede `:id` — Nest matches in declaration order, so a route added
   * below it would be swallowed as a visit whose id is "patient-view".
   */
  @Get('patient-view')
  @RequireFeature('opd.opd_patient', 'view')
  patientView(
    @BranchId() branchId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.opd.patientView(branchId, query);
  }

  @Get(':id')
  @RequireFeature('opd.opd_patient', 'view')
  detail(@BranchId() branchId: string, @Param('id') id: string) {
    return this.opd.detail(branchId, id);
  }

  @Patch(':id')
  @RequireFeature('opd.opd_patient', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(opdVisitUpdateSchema)) body: OpdVisitUpdateInput,
  ) {
    return this.opd.update(user, branchId, id, body);
  }

  @Delete(':id')
  @RequireFeature('opd.opd_patient', 'delete')
  remove(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id') id: string) {
    return this.opd.remove(user, branchId, id);
  }

  // Checkups within a visit (blueprint §7.3 tab 2). Read is gated on 'opd'
  // view so the Visits tab renders for anyone who can open the visit.
  @Get(':id/checkups')
  @RequireFeature('opd.checkup', 'view')
  listCheckups(@BranchId() branchId: string, @Param('id') id: string) {
    return this.opd.listCheckups(branchId, id);
  }

  @Post(':id/checkups')
  @RequireFeature('opd.checkup', 'add')
  createCheckup(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(opdCheckupSchema)) body: OpdCheckupInput,
  ) {
    return this.opd.createCheckup(user, branchId, id, body);
  }

  @Patch('checkups/:checkupId')
  @RequireFeature('opd.checkup', 'edit')
  updateCheckup(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('checkupId') checkupId: string,
    @Body(new ZodValidationPipe(opdCheckupSchema)) body: OpdCheckupInput,
  ) {
    return this.opd.updateCheckup(user, branchId, checkupId, body);
  }

  @Delete('checkups/:checkupId')
  @RequireFeature('opd.checkup', 'delete')
  removeCheckup(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('checkupId') checkupId: string,
  ) {
    return this.opd.removeCheckup(user, branchId, checkupId);
  }

  @Post(':id/move-to-ipd')
  // Gated on the IPD side alone, deliberately.
  //
  // "Move Patient in IPD" is `10100011` — view-only, and granted to Nurse.
  // Taken literally that would let a nurse create an IPD admission, which
  // contradicts the spec one row over, where IPD Patients gives Nurse view and
  // nothing else. So the OPD toggle is treated as what it looks like — whether
  // the button is offered — and the write is gated on the right to create an
  // admission.
  //
  // That yields Admin, Accountant, Doctor and Receptionist, matching today
  // exactly, and still keeps Nurse out. ANDing the OPD toggle as well would
  // also have excluded Accountant, which is a restriction nobody asked for.
  //
  // features.ts is a transcription and stays untouched; the divergence is here,
  // where it can be seen.
  @RequireFeature('ipd.ipd_patients', 'add')
  moveToIpd(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveToIpdSchema)) body: MoveToIpdInput,
  ) {
    return this.opd.moveToIpd(user, branchId, id, body);
  }
}
