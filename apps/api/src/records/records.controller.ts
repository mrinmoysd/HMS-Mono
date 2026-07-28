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
import { RequirePermission } from '../rbac/require-permission.decorator';
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
  @RequirePermission('birth_death', 'view')
  listBirths(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.records.listBirths(b, q);
  }
  @Get('births/:id')
  @RequirePermission('birth_death', 'view')
  getBirth(@BranchId() b: string, @Param('id') id: string) {
    return this.records.getBirth(b, id);
  }
  @Post('births')
  @RequirePermission('birth_death', 'add')
  createBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(birthRecordSchema)) body: BirthRecordInput) {
    return this.records.createBirth(u, b, body);
  }
  @Patch('births/:id')
  @RequirePermission('birth_death', 'edit')
  updateBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string, @Body(new ZodValidationPipe(birthRecordUpdateSchema)) body: BirthRecordUpdateInput) {
    return this.records.updateBirth(u, b, id, body);
  }
  @Delete('births/:id')
  @HttpCode(204)
  @RequirePermission('birth_death', 'delete')
  removeBirth(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string) {
    return this.records.removeBirth(u, b, id);
  }

  @Get('deaths')
  @RequirePermission('birth_death', 'view')
  listDeaths(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.records.listDeaths(b, q);
  }
  @Get('deaths/:id')
  @RequirePermission('birth_death', 'view')
  getDeath(@BranchId() b: string, @Param('id') id: string) {
    return this.records.getDeath(b, id);
  }
  @Post('deaths')
  @RequirePermission('birth_death', 'add')
  createDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(deathRecordSchema)) body: DeathRecordInput) {
    return this.records.createDeath(u, b, body);
  }
  @Patch('deaths/:id')
  @RequirePermission('birth_death', 'edit')
  updateDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string, @Body(new ZodValidationPipe(deathRecordUpdateSchema)) body: DeathRecordUpdateInput) {
    return this.records.updateDeath(u, b, id, body);
  }
  @Delete('deaths/:id')
  @HttpCode(204)
  @RequirePermission('birth_death', 'delete')
  removeDeath(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id') id: string) {
    return this.records.removeDeath(u, b, id);
  }
}
