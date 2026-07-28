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
  bulkDeleteSchema,
  patientImportSchema,
  patientListQuerySchema,
  patientSchema,
  phoneLookupQuerySchema,
  updatePatientSchema,
  type BulkDeleteInput,
  type PatientImportInput,
  type PatientInput,
  type PatientListQuery,
  type PhoneLookupQuery,
  type UpdatePatientInput,
} from '@smart-hospital/shared';
import { PatientService } from './patient.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('patient')
@ApiBearerAuth()
@Controller('patients')
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Get()
  @RequirePermission('patient', 'view')
  list(@BranchId() branchId: string, @Query(new ZodValidationPipe(patientListQuerySchema)) query: PatientListQuery) {
    return this.patients.list(branchId, query);
  }

  // Declared before ':id' so the literal route wins over the UUID param.
  @Get('lookup')
  @RequirePermission('patient', 'view')
  lookup(
    @BranchId() branchId: string,
    @Query(new ZodValidationPipe(phoneLookupQuerySchema)) query: PhoneLookupQuery,
  ) {
    return this.patients.findByPhone(branchId, query.phone);
  }

  @Get(':id')
  @RequirePermission('patient', 'view')
  get(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.patients.get(branchId, id);
  }

  @Post()
  @RequirePermission('patient', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(patientSchema)) body: PatientInput,
  ) {
    return this.patients.create(user, branchId, body);
  }

  @Post('import')
  @HttpCode(200)
  @RequirePermission('patient', 'add')
  import(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(patientImportSchema)) body: PatientImportInput,
  ) {
    return this.patients.import(user, branchId, body);
  }

  @Patch(':id')
  @RequirePermission('patient', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePatientSchema)) body: UpdatePatientInput,
  ) {
    return this.patients.update(user, branchId, id, body);
  }

  @Delete('bulk')
  @HttpCode(200)
  @RequirePermission('patient', 'delete')
  bulkRemove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(bulkDeleteSchema)) body: BulkDeleteInput,
  ) {
    return this.patients.bulkRemove(user, branchId, body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('patient', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.patients.remove(user, branchId, id);
  }
}
