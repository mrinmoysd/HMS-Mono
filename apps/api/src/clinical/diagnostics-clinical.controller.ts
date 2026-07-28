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
import { RequirePermission } from '../rbac/require-permission.decorator';
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
  @Get('lab')
  @RequirePermission('patient', 'view')
  listLab(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listLab(b, q);
  }
  @Post('lab')
  @RequirePermission('patient', 'edit')
  orderLab(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(orderLabSchema)) body: OrderLabInput) {
    return this.svc.orderLab(u, b, body);
  }
  @Patch('lab/:id')
  @RequirePermission('patient', 'edit')
  reportLab(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(reportLabSchema)) body: ReportLabInput) {
    return this.svc.reportLab(u, b, id, body);
  }

  // ── Prescription ───────────────────────────────────────────
  @Get('prescriptions')
  @RequirePermission('patient', 'view')
  listPrescriptions(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listPrescriptions(b, q);
  }
  @Post('prescriptions')
  @RequirePermission('patient', 'edit')
  createPrescription(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(createPrescriptionSchema)) body: CreatePrescriptionInput) {
    return this.svc.createPrescription(u, b, body);
  }

  // ── Medication ─────────────────────────────────────────────
  @Get('medication')
  @RequirePermission('patient', 'view')
  listMedication(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listMedication(b, q);
  }
  @Post('medication')
  @RequirePermission('patient', 'edit')
  addMedication(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addMedicationSchema)) body: AddMedicationInput) {
    return this.svc.addMedication(u, b, body);
  }
}
