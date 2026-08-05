import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  APPOINTMENT_EDITABLE_STATUSES,
  APPOINTMENT_TABS,
  appointmentSchema,
  convertToOpdSchema,
  listQuerySchema,
  reorderQueueSchema,
  rescheduleAppointmentSchema,
  type AppointmentInput,
  type AppointmentTab,
  type ConvertToOpdInput,
  type ListQuery,
  type ReorderQueueInput,
  type RescheduleAppointmentInput,
} from '@smart-hospital/shared';
import { z } from 'zod';
import { AppointmentService } from './appointment.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

// Deliberately the *editable* set, not APPOINTMENT_STATUSES: `consumed` claims
// an OPD visit exists, so only the conversion endpoint may set it.
const statusSchema = z.object({ status: z.enum(APPOINTMENT_EDITABLE_STATUSES) });

@ApiTags('appointment')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get()
  @RequireFeature('appointment.appointment', 'view')
  list(
    @BranchId() branchId: string,
    @Query('tab') tab: string | undefined,
    @Query('doctorId') doctorId: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const safeTab: AppointmentTab = (APPOINTMENT_TABS as readonly string[]).includes(tab ?? '')
      ? (tab as AppointmentTab)
      : 'today';
    return this.appointments.list(branchId, safeTab, doctorId, query);
  }

  // Static sub-routes declared BEFORE ':id' so they aren't shadowed.
  @Get('doctor-wise')
  @RequireFeature('appointment.doctor_wise_appointment', 'view')
  doctorWise(@BranchId() branchId: string, @Query('doctorId', ParseUUIDPipe) doctorId: string, @Query('date') date?: string) {
    return this.appointments.doctorWise(branchId, doctorId, date);
  }

  @Get('queue')
  @RequireFeature('appointment.patient_queue', 'view')
  queue(
    @BranchId() branchId: string,
    @Query('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('shift') shift: string,
    @Query('date') date: string,
    @Query('slot') slot?: string,
  ) {
    return this.appointments.queue(branchId, doctorId, shift, date, slot);
  }

  @Post('queue/reorder')
  @HttpCode(200)
  // Patient Queue is `11100010` — view is its only toggle, so view is how the
  // spec says "may work the queue". Reordering is exactly that.
  @RequireFeature('appointment.patient_queue', 'view')
  reorderQueue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(reorderQueueSchema)) body: ReorderQueueInput) {
    return this.appointments.reorderQueue(user, branchId, body.ids);
  }

  @Post()
  @RequireFeature('appointment.appointment', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(appointmentSchema)) body: AppointmentInput,
  ) {
    return this.appointments.create(user, branchId, body);
  }

  @Get(':id')
  @RequireFeature('appointment.appointment', 'view')
  get(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.get(branchId, id);
  }

  @Patch(':id')
  // Appointment is `b0b000b0` — view+add+delete, with NO edit bit. The spec
  // models changing a booked appointment as Reschedule, its own feature, so
  // that is what gates both in-place writes here. Accountant loses this: it
  // holds no Appointment or Reschedule grant at all, only the surrounding
  // Slot/Shift/Queue views.
  @RequireFeature('appointment.reschedule', 'view')
  reschedule(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rescheduleAppointmentSchema)) body: RescheduleAppointmentInput,
  ) {
    return this.appointments.reschedule(user, branchId, id, body);
  }

  @Patch(':id/status')
  // Same reasoning as PATCH :id — no edit toggle exists on Appointment.
  @RequireFeature('appointment.reschedule', 'view')
  setStatus(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: { status: string },
  ) {
    return this.appointments.setStatus(user, branchId, id, body.status);
  }

  /**
   * Needs `opd:add`, not `appointment:edit` — the meaningful thing this does is
   * create an OPD visit and bill it. A receptionist who may reschedule an
   * appointment is not thereby allowed to open an encounter.
   */
  @Post(':id/convert-to-opd')
  // Writes an OPD visit, so it is gated on the OPD side — same call as
  // move-to-IPD. Matches R1-OPD's opd.opd_patient:add set.
  @RequireFeature('opd.opd_patient', 'add')
  convertToOpd(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(convertToOpdSchema)) body: ConvertToOpdInput,
  ) {
    return this.appointments.convertToOpd(user, branchId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireFeature('appointment.appointment', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.appointments.remove(user, branchId, id);
  }
}
