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
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  @RequireFeature('human_resource.staff_attendance', 'add')
  markAttendance(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(markAttendanceSchema)) body: MarkAttendanceInput) {
    return this.wf.markAttendance(user, branchId, body);
  }

  @Get('attendance')
  @RequireFeature('human_resource.staff_attendance', 'view')
  listAttendance(@BranchId() branchId: string, @Query('date') date: string | undefined, @Query('role') role: string | undefined) {
    return this.wf.listAttendance(branchId, date, role);
  }

  @Post('attendance/save')
  @RequireFeature('human_resource.staff_attendance', 'edit')
  saveAttendance(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(saveAttendanceSchema)) body: SaveAttendanceInput) {
    return this.wf.saveAttendance(user, branchId, body);
  }

  // Shifts & roster
  @Get('shifts')
  @RequireFeature('duty_roster.shift', 'view')
  listShifts(@BranchId() branchId: string) {
    return this.wf.listShifts(branchId);
  }

  @Post('shifts')
  @RequireFeature('duty_roster.shift', 'add')
  createShift(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(shiftSchema)) body: ShiftInput) {
    return this.wf.createShift(user, branchId, body);
  }

  @Get('roster')
  @RequireFeature('duty_roster.roster_list', 'view')
  listRoster(@BranchId() branchId: string, @Query('date') date: string | undefined, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.wf.listRoster(branchId, date, q);
  }

  @Post('roster')
  @RequireFeature('duty_roster.roster_assign', 'add')
  assignRoster(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(rosterSchema)) body: RosterInput) {
    return this.wf.assignRoster(user, branchId, body);
  }

  // Payroll
  @Get('payroll')
  @RequireFeature('human_resource.staff_payroll', 'view')
  listPayroll(@BranchId() branchId: string, @Query('role') role: string | undefined, @Query('month') month: string) {
    return this.wf.listPayroll(branchId, role, month || new Date().toISOString().slice(0, 7));
  }

  @Get('payroll/:userId')
  @RequireFeature('human_resource.staff_payroll', 'view')
  getPayslip(@BranchId() branchId: string, @Param('userId', ParseUUIDPipe) userId: string, @Query('month') month: string) {
    return this.wf.getPayslip(branchId, userId, month || new Date().toISOString().slice(0, 7));
  }

  @Post('payroll')
  @RequireFeature('human_resource.staff_payroll', 'add')
  generatePayroll(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(payrollSchema)) body: PayrollInput) {
    return this.wf.generatePayroll(user, branchId, body);
  }

  // Leave types
  @Get('leave-types')
  @RequireFeature('human_resource.leave_types', 'view')
  listLeaveTypes(@BranchId() branchId: string) {
    return this.wf.listLeaveTypes(branchId);
  }

  @Post('leave-types')
  @RequireFeature('human_resource.leave_types', 'add')
  createLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(leaveTypeSchema)) body: LeaveTypeInput) {
    return this.wf.createLeaveType(user, branchId, body);
  }

  @Patch('leave-types/:id')
  @RequireFeature('human_resource.leave_types', 'edit')
  updateLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(leaveTypeSchema)) body: LeaveTypeInput) {
    return this.wf.updateLeaveType(user, branchId, id, body);
  }

  @Delete('leave-types/:id')
  @HttpCode(204)
  @RequireFeature('human_resource.leave_types', 'delete')
  async removeLeaveType(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.wf.removeLeaveType(user, branchId, id);
  }

  // Leaves
  // Apply Leave is granted to every role, so every role reaches this list. Who
  // may see whose request is a question about the rows, not the route, and the
  // service answers it: your own unless you can approve.
  @Get('leaves')
  @RequireFeature('human_resource.apply_leave', 'view')
  listLeaves(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.wf.listLeaveRequests(user, branchId, q);
  }

  @Get('leaves/:id')
  @RequireFeature('human_resource.apply_leave', 'view')
  getLeave(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.wf.getLeaveRequestForUser(user, branchId, id);
  }

  @Post('leaves')
  @RequireFeature('human_resource.apply_leave', 'add')
  createLeave(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(leaveRequestSchema)) body: LeaveRequestInput) {
    return this.wf.createLeaveRequest(user, branchId, body);
  }

  @Patch('leaves/:id/status')
  @RequireFeature('human_resource.approve_leave_request', 'edit')
  setLeaveStatus(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(leaveStatusSchema)) body: LeaveStatusInput) {
    return this.wf.setLeaveStatus(user, branchId, id, body);
  }

  @Delete('leaves/:id')
  @HttpCode(204)
  @RequireFeature('human_resource.apply_leave', 'delete')
  async removeLeave(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.wf.removeLeaveRequest(user, branchId, id);
  }
}
