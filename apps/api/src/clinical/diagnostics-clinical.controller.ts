import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addMedicationSchema,
  createPrescriptionSchema,
  orderLabSchema,
  reportLabSchema,
  type AddMedicationInput,
  type CreatePrescriptionInput,
  type OrderLabInput,
  type ReportLabInput,
} from '@smart-hospital/shared';
import { DiagnosticsClinicalService } from './diagnostics-clinical.service';
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
export class DiagnosticsClinicalController {
  constructor(private readonly svc: DiagnosticsClinicalService) {}

  // ── Lab Investigation ──────────────────────────────────────
  // Lab Investigation is view-only on both sides — its sole toggle.
  @Get('lab')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.lab, 'view'))
  listLab(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listLab(b, q);
  }
  @Post('lab')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.lab, 'view'))
  orderLab(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(orderLabSchema)) body: OrderLabInput) {
    return this.svc.orderLab(u, b, body);
  }
  @Patch('lab/:id')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.lab, 'view'))
  reportLab(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(reportLabSchema)) body: ReportLabInput) {
    return this.svc.reportLab(u, b, id, body);
  }

  // ── Prescription ───────────────────────────────────────────
  @Get('prescriptions')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.prescription, 'view'))
  listPrescriptions(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listPrescriptions(b, q);
  }
  @Post('prescriptions')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.prescription, 'add'))
  createPrescription(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createPrescriptionSchema)) body: CreatePrescriptionInput) {
    return this.svc.createPrescription(u, b, body);
  }

  // ── Medication ─────────────────────────────────────────────
  @Get('medication')
  @RequireFeatureFor((c) => encounterFeature(c.query.encounterType, ...EF.medication, 'view'))
  listMedication(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listMedication(b, q);
  }
  @Post('medication')
  @RequireFeatureFor((c) => encounterFeature(c.body.encounterType, ...EF.medication, 'add'))
  addMedication(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addMedicationSchema)) body: AddMedicationInput) {
    return this.svc.addMedication(u, b, body);
  }
}
