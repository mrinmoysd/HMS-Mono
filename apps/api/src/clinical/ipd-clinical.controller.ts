import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addConsultantRegisterSchema,
  addNurseNoteSchema,
  type AddConsultantRegisterInput,
  type AddNurseNoteInput,
} from '@smart-hospital/shared';
import { IpdClinicalService } from './ipd-clinical.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

type EncQuery = { patientId: string; encounterType?: 'opd' | 'ipd'; encounterId?: string };

@ApiTags('clinical')
@ApiBearerAuth()
@Controller('clinical')
export class IpdClinicalController {
  constructor(private readonly svc: IpdClinicalService) {}

  // ── Nurse Notes ────────────────────────────────────────────
  @Get('nurse-notes')
  @RequirePermission('patient', 'view')
  listNurseNotes(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listNurseNotes(b, q);
  }
  @Post('nurse-notes')
  @RequirePermission('patient', 'edit')
  addNurseNote(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addNurseNoteSchema)) body: AddNurseNoteInput) {
    return this.svc.addNurseNote(u, b, body);
  }

  // ── Consultant Register ────────────────────────────────────
  @Get('consultant-register')
  @RequirePermission('patient', 'view')
  listConsultantRegister(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listConsultantRegister(b, q);
  }
  @Post('consultant-register')
  @RequirePermission('patient', 'edit')
  addConsultantRegister(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addConsultantRegisterSchema)) body: AddConsultantRegisterInput) {
    return this.svc.addConsultantRegister(u, b, body);
  }
}
