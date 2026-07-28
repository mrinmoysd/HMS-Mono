import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  diagnosticBillSchema,
  diagnosticCategorySchema,
  diagnosticTestSchema,
  diagnosticUnitSchema,
  listQuerySchema,
  type DiagnosticBillInput,
  type DiagnosticCategoryInput,
  type DiagnosticTestInput,
  type DiagnosticUnitInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { DiagnosticsService } from './diagnostics.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('pathology')
@ApiBearerAuth()
@Controller('pathology')
export class PathologyController {
  constructor(private readonly diagnostics: DiagnosticsService) {}

  @Get('tests')
  @RequirePermission('pathology', 'view')
  listTests(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listTests(branchId, 'pathology', q);
  }

  @Get('tests/:id')
  @RequirePermission('pathology', 'view')
  getTest(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.diagnostics.getTest(branchId, 'pathology', id);
  }

  @Get('previous-reports')
  @RequirePermission('pathology', 'view')
  previousReports(@BranchId() branchId: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.diagnostics.previousReports(branchId, 'pathology', patientId);
  }

  @Post('tests')
  @RequirePermission('pathology', 'add')
  createTest(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticTestSchema)) body: DiagnosticTestInput,
  ) {
    return this.diagnostics.createTest(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('tests/:id')
  @RequirePermission('pathology', 'edit')
  updateTest(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticTestSchema)) body: DiagnosticTestInput,
  ) {
    return this.diagnostics.updateTest(user, branchId, id, { ...body, modality: 'pathology' });
  }

  @Delete('tests/:id')
  @HttpCode(204)
  @RequirePermission('pathology', 'delete')
  async removeTest(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeTest(user, branchId, 'pathology', id);
  }

  @Post('bills')
  @RequirePermission('pathology', 'add')
  generateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticBillSchema)) body: DiagnosticBillInput,
  ) {
    return this.diagnostics.generateBill(user, branchId, { ...body, modality: 'pathology' });
  }

  // Category (Setup master)
  @Get('categories')
  @RequirePermission('setup', 'view')
  listCategories(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listCategories(branchId, 'pathology', q);
  }

  @Post('categories')
  @RequirePermission('setup', 'add')
  createCategory(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticCategorySchema)) body: DiagnosticCategoryInput,
  ) {
    return this.diagnostics.createCategory(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('categories/:id')
  @RequirePermission('setup', 'edit')
  updateCategory(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticCategorySchema)) body: DiagnosticCategoryInput,
  ) {
    return this.diagnostics.updateCategory(user, branchId, id, { ...body, modality: 'pathology' });
  }

  @Delete('categories/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removeCategory(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeCategory(user, branchId, 'pathology', id);
  }

  // Unit (Setup master)
  @Get('units')
  @RequirePermission('setup', 'view')
  listUnits(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listUnits(branchId, 'pathology', q);
  }

  @Post('units')
  @RequirePermission('setup', 'add')
  createUnit(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticUnitSchema)) body: DiagnosticUnitInput,
  ) {
    return this.diagnostics.createUnit(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('units/:id')
  @RequirePermission('setup', 'edit')
  updateUnit(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticUnitSchema)) body: DiagnosticUnitInput,
  ) {
    return this.diagnostics.updateUnit(user, branchId, id, { ...body, modality: 'pathology' });
  }

  @Delete('units/:id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async removeUnit(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeUnit(user, branchId, 'pathology', id);
  }
}
