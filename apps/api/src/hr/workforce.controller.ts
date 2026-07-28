import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  leaveRequestSchema,
  leaveStatusSchema,
  leaveTypeSchema,
  listQuerySchema,
  markAttendanceSchema,
  payrollSchema,
  rosterSchema,
  saveAttendanceSchema,
  shiftSchema,
  type LeaveRequestInput,
  type LeaveStatusInput,
  type LeaveTypeInput,
  type ListQuery,
  type MarkAttendanceInput,
  type PayrollInput,
  type RosterInput,
  type SaveAttendanceInput,
  type ShiftInput,
} from '@smart-hospital/shared';
import { WorkforceService } from './workforce.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('hr-workforce')
@ApiBearerAuth()
@Controller('hr')
export class WorkforceController {
  constructor(private readonly wf: WorkforceService) {}

  // Attendance
  @Post('attendance/mark')
  markAttendance(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(markAttendanceSchema)) body: MarkAttendanceInput) {
    return this.wf.markAttendance(user, branchId, body);
  }

  @Get('attendance')
  @RequirePermission('human_resource', 'view')
  listAttendance(@BranchId() branchId: string, @Query('date') date: string | undefined, @Query('role') role: string | undefined) {
    return this.wf.listAttendance(branchId, date, role);
  }

  @Post('attendance/save')
  @RequirePermission('human_resource', 'edit')
  saveAttendance(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(saveAttendanceSchema)) body: SaveAttendanceInput) {
    return this.wf.saveAttendance(user, branchId, body);
  }

  // Shifts & roster
  @Get('shifts')
  @RequirePermission('human_resource', 'view')
  listShifts(@BranchId() branchId: string) {
    return this.wf.listShifts(branchId);
  }

  @Post('shifts')
  @RequirePermission('human_resource', 'add')
  createShift(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(shiftSchema)) body: ShiftInput) {
    return this.wf.createShift(user, branchId, body);
  }

  @Get('roster')
  @RequirePermission('human_resource', 'view')
  listRoster(@BranchId() branchId: string, @Query('date') date: string | undefined, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.wf.listRoster(branchId, date, q);
  }

  @Post('roster')
  @RequirePermission('human_resource', 'add')
  assignRoster(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(rosterSchema)) body: RosterInput) {
    return this.wf.assignRoster(user, branchId, body);
  }

  // Payroll
  @Get('payroll')
  @RequirePermission('human_resource', 'view')
  listPayroll(@BranchId() branchId: string, @Query('role') role: string | undefined, @Query('month') month: string) {
    return this.wf.listPayroll(branchId, role, month || new Date().toISOString().slice(0, 7));
  }

  @Get('payroll/:userId')
  @RequirePermission('human_resource', 'view')
  getPayslip(@BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string, @Query('month') month: string) {
    return this.wf.getPayslip(branchId, userId, month || new Date().toISOString().slice(0, 7));
  }

  @Post('payroll')
  @RequirePermission('human_resource', 'add')
  generatePayroll(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(payrollSchema)) body: PayrollInput) {
    return this.wf.generatePayroll(user, branchId, body);
  }

  // Leave types
  @Get('leave-types')
  @RequirePermission('human_resource', 'view')
  listLeaveTypes(@BranchId() branchId: string) {
    return this.wf.listLeaveTypes(branchId);
  }

  @Post('leave-types')
  @RequirePermission('human_resource', 'add')
  createLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(leaveTypeSchema)) body: LeaveTypeInput) {
    return this.wf.createLeaveType(user, branchId, body);
  }

  @Patch('leave-types/:id')
  @RequirePermission('human_resource', 'edit')
  updateLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(leaveTypeSchema)) body: LeaveTypeInput) {
    return this.wf.updateLeaveType(user, branchId, id, body);
  }

  @Delete('leave-types/:id')
  @HttpCode(204)
  @RequirePermission('human_resource', 'delete')
  async removeLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.wf.removeLeaveType(user, branchId, id);
  }

  // Leaves
  @Get('leaves')
  @RequirePermission('human_resource', 'view')
  listLeaves(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.wf.listLeaveRequests(branchId, q);
  }

  @Get('leaves/:id')
  @RequirePermission('human_resource', 'view')
  getLeave(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.wf.getLeaveRequest(branchId, id);
  }

  @Post('leaves')
  @RequirePermission('human_resource', 'add')
  createLeave(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(leaveRequestSchema)) body: LeaveRequestInput) {
    return this.wf.createLeaveRequest(user, branchId, body);
  }

  @Patch('leaves/:id/status')
  @RequirePermission('human_resource', 'edit')
  setLeaveStatus(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(leaveStatusSchema)) body: LeaveStatusInput) {
    return this.wf.setLeaveStatus(user, branchId, id, body);
  }

  @Delete('leaves/:id')
  @HttpCode(204)
  @RequirePermission('human_resource', 'delete')
  async removeLeave(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.wf.removeLeaveRequest(user, branchId, id);
  }
}
