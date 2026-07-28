import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  appointmentPrioritySchema,
  shiftSchema,
  slotConfigSchema,
  toggleDoctorShiftSchema,
  type AppointmentPriorityInput,
  type ShiftInput,
  type SlotConfigInput,
  type ToggleDoctorShiftInput,
} from '@smart-hospital/shared'; // shiftSchema/ShiftInput come from dto/hr
import { AppointmentSetupService } from './appointment-setup.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('appointment-setup')
@ApiBearerAuth()
@Controller()
export class AppointmentSetupController {
  constructor(private readonly svc: AppointmentSetupService) {}

  // ── Shifts ─────────────────────────────────────────────────
  @Get('shifts')
  @RequirePermission('appointment', 'view')
  listShifts(@BranchId() b: string) {
    return this.svc.listShifts(b);
  }
  @Post('shifts')
  @RequirePermission('setup', 'add')
  createShift(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(shiftSchema)) body: ShiftInput) {
    return this.svc.createShift(u, b, body);
  }
  @Patch('shifts/:id')
  @RequirePermission('setup', 'edit')
  updateShift(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(shiftSchema)) body: ShiftInput) {
    return this.svc.updateShift(u, b, id, body);
  }
  @Delete('shifts/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removeShift(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeShift(u, b, id);
  }

  // ── Appointment priorities ─────────────────────────────────
  @Get('appointment-priorities')
  @RequirePermission('appointment', 'view')
  listPriorities(@BranchId() b: string) {
    return this.svc.listPriorities(b);
  }
  @Post('appointment-priorities')
  @RequirePermission('setup', 'add')
  createPriority(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(appointmentPrioritySchema)) body: AppointmentPriorityInput) {
    return this.svc.createPriority(u, b, body);
  }
  @Patch('appointment-priorities/:id')
  @RequirePermission('setup', 'edit')
  updatePriority(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(appointmentPrioritySchema)) body: AppointmentPriorityInput) {
    return this.svc.updatePriority(u, b, id, body);
  }
  @Delete('appointment-priorities/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removePriority(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePriority(u, b, id);
  }

  // ── Doctor Shift matrix + slot config ──────────────────────
  @Get('doctor-shifts')
  @RequirePermission('appointment', 'view')
  matrix(@BranchId() b: string) {
    return this.svc.doctorShiftMatrix(b);
  }
  @Post('doctor-shifts/toggle')
  @HttpCode(200)
  @RequirePermission('setup', 'edit')
  toggle(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(toggleDoctorShiftSchema)) body: ToggleDoctorShiftInput) {
    return this.svc.toggleDoctorShift(u, b, body);
  }
  @Get('doctor-shifts/slot-config')
  @RequirePermission('appointment', 'view')
  getSlotConfig(@BranchId() b: string, @Query('doctorId', ParseUUIDPipe) doctorId: string, @Query('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.svc.getSlotConfig(b, doctorId, shiftId);
  }
  @Post('doctor-shifts/slot-config')
  @HttpCode(200)
  @RequirePermission('setup', 'edit')
  saveSlotConfig(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(slotConfigSchema)) body: SlotConfigInput) {
    return this.svc.saveSlotConfig(u, b, body);
  }

  // ── Slot generation + fee lookup (used by the appointment form) ──
  @Get('appointments/slots')
  @RequirePermission('appointment', 'view')
  slots(@BranchId() b: string, @Query('doctorId', ParseUUIDPipe) doctorId: string, @Query('shiftId', ParseUUIDPipe) shiftId: string, @Query('date') date: string) {
    return this.svc.availableSlots(b, doctorId, shiftId, date);
  }
  @Get('appointments/doctor-fee')
  @RequirePermission('appointment', 'view')
  doctorFee(@BranchId() b: string, @Query('doctorId', ParseUUIDPipe) doctorId: string, @Query('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.svc.doctorFee(b, doctorId, shiftId);
  }
}
