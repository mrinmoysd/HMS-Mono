import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createLiveConsultSchema,
  createOperationSchema,
  updateLiveConsultStatusSchema,
  type CreateLiveConsultInput,
  type CreateOperationInput,
  type UpdateLiveConsultStatusInput,
} from '@smart-hospital/shared';
import { OperationsClinicalService } from './operations-clinical.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

type EncQuery = { patientId: string; encounterType?: 'opd' | 'ipd'; encounterId?: string };

@ApiTags('clinical')
@ApiBearerAuth()
@Controller('clinical')
export class OperationsClinicalController {
  constructor(private readonly svc: OperationsClinicalService) {}

  // ── Operations (OT) ────────────────────────────────────────
  @Get('operations')
  @RequirePermission('patient', 'view')
  listOperations(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listOperations(b, q);
  }
  @Post('operations')
  @RequirePermission('patient', 'edit')
  createOperation(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createOperationSchema)) body: CreateOperationInput) {
    return this.svc.createOperation(u, b, body);
  }

  // ── Live Consultation ──────────────────────────────────────
  @Get('live-consults')
  @RequirePermission('patient', 'view')
  listLiveConsults(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listLiveConsults(b, q);
  }
  @Post('live-consults')
  @RequirePermission('patient', 'edit')
  createLiveConsult(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createLiveConsultSchema)) body: CreateLiveConsultInput) {
    return this.svc.createLiveConsult(u, b, body);
  }
  @Patch('live-consults/:id')
  @RequirePermission('patient', 'edit')
  updateStatus(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateLiveConsultStatusSchema)) body: UpdateLiveConsultStatusInput) {
    return this.svc.updateLiveConsultStatus(u, b, id, body);
  }
}
