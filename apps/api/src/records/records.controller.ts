import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  birthRecordSchema,
  birthRecordUpdateSchema,
  deathRecordSchema,
  deathRecordUpdateSchema,
  listQuerySchema,
  type BirthRecordInput,
  type BirthRecordUpdateInput,
  type DeathRecordInput,
  type DeathRecordUpdateInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { RecordsService } from './records.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('birth-death')
@ApiBearerAuth()
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('births')
  @RequireFeature('birth_death.birth_record', 'view')
  listBirths(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.records.listBirths(b, q);
  }
  @Get('births/:id')
  @RequireFeature('birth_death.birth_record', 'view')
  getBirth(@BranchId() b: string, @Param('id') id: string) {
    return this.records.getBirth(b, id);
  }
  @Post('births')
  @RequireFeature('birth_death.birth_record', 'add')
  createBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(birthRecordSchema)) body: BirthRecordInput) {
    return this.records.createBirth(u, b, body);
  }
  @Patch('births/:id')
  @RequireFeature('birth_death.birth_record', 'edit')
  updateBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string, @Body(new ZodValidationPipe(birthRecordUpdateSchema)) body: BirthRecordUpdateInput) {
    return this.records.updateBirth(u, b, id, body);
  }
  @Delete('births/:id')
  @HttpCode(204)
  @RequireFeature('birth_death.birth_record', 'delete')
  removeBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string) {
    return this.records.removeBirth(u, b, id);
  }

  @Get('deaths')
  @RequireFeature('birth_death.death_record', 'view')
  listDeaths(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.records.listDeaths(b, q);
  }
  @Get('deaths/:id')
  @RequireFeature('birth_death.death_record', 'view')
  getDeath(@BranchId() b: string, @Param('id') id: string) {
    return this.records.getDeath(b, id);
  }
  @Post('deaths')
  @RequireFeature('birth_death.death_record', 'add')
  createDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(deathRecordSchema)) body: DeathRecordInput) {
    return this.records.createDeath(u, b, body);
  }
  @Patch('deaths/:id')
  @RequireFeature('birth_death.death_record', 'edit')
  updateDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string, @Body(new ZodValidationPipe(deathRecordUpdateSchema)) body: DeathRecordUpdateInput) {
    return this.records.updateDeath(u, b, id, body);
  }
  @Delete('deaths/:id')
  @HttpCode(204)
  @RequireFeature('birth_death.death_record', 'delete')
  removeDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string) {
    return this.records.removeDeath(u, b, id);
  }
}
