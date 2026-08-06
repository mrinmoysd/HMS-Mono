import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  rosterAssignmentSchema,
  rosterPeriodSchema,
  shiftSchema,
  shiftUpdateSchema,
  type ListQuery,
  type RosterAssignmentInput,
  type RosterPeriodInput,
  type ShiftInput,
  type ShiftUpdateInput,
} from '@smart-hospital/shared';
import { DutyRosterService } from './duty-roster.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('duty-roster')
@ApiBearerAuth()
@Controller('duty-roster')
export class DutyRosterController {
  constructor(private readonly svc: DutyRosterService) {}

  // ── Shifts ─────────────────────────────────────────────
  @Get('shifts')
  @RequireFeature('duty_roster.shift', 'view')
  listShifts(@BranchId() branchId: string) {
    return this.svc.listShifts(branchId);
  }

  @Post('shifts')
  @RequireFeature('duty_roster.shift', 'add')
  createShift(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(shiftSchema)) body: ShiftInput) {
    return this.svc.createShift(user, branchId, body);
  }

  @Patch('shifts/:id')
  @RequireFeature('duty_roster.shift', 'edit')
  updateShift(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(shiftUpdateSchema)) body: ShiftUpdateInput) {
    return this.svc.updateShift(user, branchId, id, body);
  }

  @Delete('shifts/:id')
  @HttpCode(204)
  @RequireFeature('duty_roster.shift', 'delete')
  async removeShift(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeShift(user, branchId, id);
  }

  // ── Roster periods ─────────────────────────────────────
  @Get('rosters')
  @RequireFeature('duty_roster.roster_list', 'view')
  listRosters(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.svc.listRosterPeriods(branchId, q);
  }

  @Get('rosters/all')
  @RequireFeature('duty_roster.roster_list', 'view')
  allRosters(@BranchId() branchId: string) {
    return this.svc.allRosterPeriods(branchId);
  }

  @Post('rosters')
  @RequireFeature('duty_roster.roster_list', 'add')
  createRoster(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(rosterPeriodSchema)) body: RosterPeriodInput) {
    return this.svc.createRosterPeriod(user, branchId, body);
  }

  @Delete('rosters/:id')
  @HttpCode(204)
  @RequireFeature('duty_roster.roster_list', 'delete')
  async removeRoster(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeRosterPeriod(user, branchId, id);
  }

  // ── Assignments ────────────────────────────────────────
  @Get('assignments')
  @RequireFeature('duty_roster.roster_assign', 'view')
  listAssignments(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.svc.listAssignments(branchId, q);
  }

  @Post('assignments')
  @RequireFeature('duty_roster.roster_assign', 'add')
  createAssignment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(rosterAssignmentSchema)) body: RosterAssignmentInput) {
    return this.svc.createAssignment(user, branchId, body);
  }

  @Patch('assignments/:id')
  @RequireFeature('duty_roster.roster_assign', 'edit')
  updateAssignment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(rosterAssignmentSchema)) body: RosterAssignmentInput) {
    return this.svc.updateAssignment(user, branchId, id, body);
  }

  @Delete('assignments/:id')
  @HttpCode(204)
  @RequireFeature('duty_roster.roster_assign', 'delete')
  async removeAssignment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeAssignment(user, branchId, id);
  }

  // ── Main daily list ────────────────────────────────────
  @Get()
  @RequireFeature('duty_roster.duty_roster', 'view')
  dailyList(@BranchId() branchId: string, @Query('rosterId') rosterId: string | undefined, @Query('staffUserId') staffUserId: string | undefined) {
    return this.svc.dailyList(branchId, rosterId || undefined, staffUserId || undefined);
  }
}
