import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  diagnosticBillSchema,
  diagnosticBillUpdateSchema,
  diagnosticCategorySchema,
  diagnosticTestSchema,
  diagnosticUnitSchema,
  listQuerySchema,
  type DiagnosticBillInput,
  type DiagnosticBillUpdateInput,
  type DiagnosticCategoryInput,
  type DiagnosticTestInput,
  type DiagnosticUnitInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { DiagnosticsService } from './diagnostics.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  @RequireFeature('pathology.pathology_test', 'view')
  listTests(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listTests(branchId, 'pathology', q);
  }

  @Get('tests/:id')
  @RequireFeature('pathology.pathology_test', 'view')
  getTest(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.diagnostics.getTest(branchId, 'pathology', id);
  }

  @Get('previous-reports')
  @RequireFeature('pathology.pathology_test', 'view')
  previousReports(@BranchId() branchId: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.diagnostics.previousReports(branchId, 'pathology', patientId);
  }

  @Post('tests')
  @RequireFeature('pathology.pathology_test', 'add')
  createTest(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticTestSchema)) body: DiagnosticTestInput,
  ) {
    return this.diagnostics.createTest(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('tests/:id')
  @RequireFeature('pathology.pathology_test', 'edit')
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
  @RequireFeature('pathology.pathology_test', 'delete')
  async removeTest(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeTest(user, branchId, 'pathology', id);
  }

  @Post('bills')
  @RequireFeature('pathology.pathology_bill', 'add')
  generateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticBillSchema)) body: DiagnosticBillInput,
  ) {
    return this.diagnostics.generateBill(user, branchId, { ...body, modality: 'pathology' });
  }

  /** Preview the next bill number for the Generate Bill form. Does not consume it. */
  @Get('bills/next-no')
  // Read only by the create form, so it follows who may create a bill.
  @RequireFeature('pathology.pathology_bill', 'add')
  nextBillNo(@BranchId() branchId: string, @Query('patientId') patientId?: string) {
    return this.diagnostics.nextBillNo(branchId, 'pathology', patientId);
  }

  @Patch('bills/:id')
  @RequireFeature('pathology.pathology_bill', 'edit')
  updateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(diagnosticBillUpdateSchema)) body: DiagnosticBillUpdateInput,
  ) {
    return this.diagnostics.updateBill(user, branchId, 'pathology', id, body);
  }

  @Delete('bills/:id')
  @RequireFeature('pathology.pathology_bill', 'delete')
  @HttpCode(204)
  deleteBill(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id') id: string) {
    return this.diagnostics.deleteBill(user, branchId, 'pathology', id);
  }

  // Category (Setup master)
  // Categories, Units and Parameters were gated on generic `setup:*`, which
  // made them Admin-only. They are Pathology features with full CRUD for the
  // Pathologist, who is the person who actually curates them.
  @Get('categories')
  @RequireFeature('pathology.pathology_category', 'view')
  listCategories(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listCategories(branchId, 'pathology', q);
  }

  @Post('categories')
  @RequireFeature('pathology.pathology_category', 'add')
  createCategory(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticCategorySchema)) body: DiagnosticCategoryInput,
  ) {
    return this.diagnostics.createCategory(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('categories/:id')
  @RequireFeature('pathology.pathology_category', 'edit')
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
  @RequireFeature('pathology.pathology_category', 'delete')
  async removeCategory(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeCategory(user, branchId, 'pathology', id);
  }

  // Unit (Setup master)
  @Get('units')
  @RequireFeature('pathology.pathology_unit', 'view')
  listUnits(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listUnits(branchId, 'pathology', q);
  }

  @Post('units')
  @RequireFeature('pathology.pathology_unit', 'add')
  createUnit(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticUnitSchema)) body: DiagnosticUnitInput,
  ) {
    return this.diagnostics.createUnit(user, branchId, { ...body, modality: 'pathology' });
  }

  @Patch('units/:id')
  @RequireFeature('pathology.pathology_unit', 'edit')
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
  @RequireFeature('pathology.pathology_unit', 'delete')
  async removeUnit(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeUnit(user, branchId, 'pathology', id);
  }
}
