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
import { RequireFeature, RequireFeatureFor } from '../rbac/require-feature.decorator';
import { ENCOUNTER_FEATURES as EF, encounterFeature } from './clinical-features';
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
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.operationTheatre, 'view'))
  listOperations(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listOperations(b, q);
  }
  @Post('operations')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.operationTheatre, 'add'))
  createOperation(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createOperationSchema)) body: CreateOperationInput) {
    return this.svc.createOperation(u, b, body);
  }

  // ── Live Consultation ──────────────────────────────────────
  // Live Consult is view-only in the spec on both sides, so view is the only
  // toggle these can hang off.
  @Get('live-consults')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.liveConsult, 'view'))
  listLiveConsults(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listLiveConsults(b, q);
  }
  @Post('live-consults')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.liveConsult, 'view'))
  createLiveConsult(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createLiveConsultSchema)) body: CreateLiveConsultInput) {
    return this.svc.createLiveConsult(u, b, body);
  }
  @Patch('live-consults/:id')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.liveConsult, 'view'))
  updateStatus(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateLiveConsultStatusSchema)) body: UpdateLiveConsultStatusInput) {
    return this.svc.updateLiveConsultStatus(u, b, id, body);
  }
}
