import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addConsultantRegisterSchema,
  addNurseNoteSchema,
  type AddConsultantRegisterInput,
  type AddNurseNoteInput,
} from '@smart-hospital/shared';
import { IpdClinicalService } from './ipd-clinical.service';
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
export class IpdClinicalController {
  constructor(private readonly svc: IpdClinicalService) {}

  // ── Nurse Notes ────────────────────────────────────────────
  // Nurse Note and Consultant Register are IPD-only features, and both are
  // `f0f0000f` — Admin, Doctor and Nurse hold full CRUD. Under `patient:edit`
  // these were Admin-only, so a nurse could not write a nurse note.
  @Get('nurse-notes')
  @RequireFeature('ipd.nurse_note', 'view')
  listNurseNotes(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listNurseNotes(b, q);
  }
  @Post('nurse-notes')
  @RequireFeature('ipd.nurse_note', 'add')
  addNurseNote(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addNurseNoteSchema)) body: AddNurseNoteInput) {
    return this.svc.addNurseNote(u, b, body);
  }

  // ── Consultant Register ────────────────────────────────────
  @Get('consultant-register')
  @RequireFeature('ipd.consultant_register', 'view')
  listConsultantRegister(@BranchId() b: string, @Query() q: EncQuery) {
    return this.svc.listConsultantRegister(b, q);
  }
  @Post('consultant-register')
  @RequireFeature('ipd.consultant_register', 'add')
  addConsultantRegister(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(addConsultantRegisterSchema)) body: AddConsultantRegisterInput) {
    return this.svc.addConsultantRegister(u, b, body);
  }
}
