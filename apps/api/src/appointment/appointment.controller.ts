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
  APPOINTMENT_STATUSES,
  APPOINTMENT_TABS,
  appointmentSchema,
  listQuerySchema,
  reorderQueueSchema,
  rescheduleAppointmentSchema,
  type AppointmentInput,
  type AppointmentTab,
  type ListQuery,
  type ReorderQueueInput,
  type RescheduleAppointmentInput,
} from '@smart-hospital/shared';
import { z } from 'zod';
import { AppointmentService } from './appointment.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

const statusSchema = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

@ApiTags('appointment')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get()
  @RequirePermission('appointment', 'view')
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
  @RequirePermission('appointment', 'view')
  doctorWise(@BranchId() branchId: string, @Query('doctorId', ParseUUIDPipe) doctorId: string, @Query('date') date?: string) {
    return this.appointments.doctorWise(branchId, doctorId, date);
  }

  @Get('queue')
  @RequirePermission('appointment', 'view')
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
  @RequirePermission('appointment', 'edit')
  reorderQueue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(reorderQueueSchema)) body: ReorderQueueInput) {
    return this.appointments.reorderQueue(user, branchId, body.ids);
  }

  @Post()
  @RequirePermission('appointment', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(appointmentSchema)) body: AppointmentInput,
  ) {
    return this.appointments.create(user, branchId, body);
  }

  @Get(':id')
  @RequirePermission('appointment', 'view')
  get(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.get(branchId, id);
  }

  @Patch(':id')
  @RequirePermission('appointment', 'edit')
  reschedule(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rescheduleAppointmentSchema)) body: RescheduleAppointmentInput,
  ) {
    return this.appointments.reschedule(user, branchId, id, body);
  }

  @Patch(':id/status')
  @RequirePermission('appointment', 'edit')
  setStatus(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: { status: string },
  ) {
    return this.appointments.setStatus(user, branchId, id, body.status);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('appointment', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.appointments.remove(user, branchId, id);
  }
}
