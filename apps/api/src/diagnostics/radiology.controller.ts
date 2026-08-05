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

@ApiTags('radiology')
@ApiBearerAuth()
@Controller('radiology')
export class RadiologyController {
  constructor(private readonly diagnostics: DiagnosticsService) {}

  @Get('tests')
  @RequireFeature('radiology.radiology_test', 'view')
  listTests(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listTests(branchId, 'radiology', q);
  }

  @Get('tests/:id')
  @RequireFeature('radiology.radiology_test', 'view')
  getTest(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.diagnostics.getTest(branchId, 'radiology', id);
  }

  @Get('previous-reports')
  @RequireFeature('radiology.radiology_test', 'view')
  previousReports(@BranchId() branchId: string, @Query('patientId', ParseUUIDPipe) patientId: string) {
    return this.diagnostics.previousReports(branchId, 'radiology', patientId);
  }

  @Post('tests')
  @RequireFeature('radiology.radiology_test', 'add')
  createTest(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticTestSchema)) body: DiagnosticTestInput,
  ) {
    return this.diagnostics.createTest(user, branchId, { ...body, modality: 'radiology' });
  }

  @Patch('tests/:id')
  @RequireFeature('radiology.radiology_test', 'edit')
  updateTest(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticTestSchema)) body: DiagnosticTestInput,
  ) {
    return this.diagnostics.updateTest(user, branchId, id, { ...body, modality: 'radiology' });
  }

  @Delete('tests/:id')
  @HttpCode(204)
  @RequireFeature('radiology.radiology_test', 'delete')
  async removeTest(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeTest(user, branchId, 'radiology', id);
  }

  @Post('bills')
  @RequireFeature('radiology.radiology_bill', 'add')
  generateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticBillSchema)) body: DiagnosticBillInput,
  ) {
    return this.diagnostics.generateBill(user, branchId, { ...body, modality: 'radiology' });
  }

  /** Preview the next bill number for the Generate Bill form. Does not consume it. */
  @Get('bills/next-no')
  // Read only by the create form, so it follows who may create a bill.
  @RequireFeature('radiology.radiology_bill', 'add')
  nextBillNo(@BranchId() branchId: string, @Query('patientId') patientId?: string) {
    return this.diagnostics.nextBillNo(branchId, 'radiology', patientId);
  }

  @Patch('bills/:id')
  @RequireFeature('radiology.radiology_bill', 'edit')
  updateBill(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(diagnosticBillUpdateSchema)) body: DiagnosticBillUpdateInput,
  ) {
    return this.diagnostics.updateBill(user, branchId, 'radiology', id, body);
  }

  @Delete('bills/:id')
  @RequireFeature('radiology.radiology_bill', 'delete')
  @HttpCode(204)
  deleteBill(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id') id: string) {
    return this.diagnostics.deleteBill(user, branchId, 'radiology', id);
  }

  // Category (Setup master)
  // Categories, Units and Parameters were gated on generic `setup:*`, which
  // made them Admin-only. They are Radiology features with full CRUD for the
  // Radiologist, who is the person who actually curates them.
  @Get('categories')
  @RequireFeature('radiology.radiology_category', 'view')
  listCategories(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listCategories(branchId, 'radiology', q);
  }

  @Post('categories')
  @RequireFeature('radiology.radiology_category', 'add')
  createCategory(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticCategorySchema)) body: DiagnosticCategoryInput,
  ) {
    return this.diagnostics.createCategory(user, branchId, { ...body, modality: 'radiology' });
  }

  @Patch('categories/:id')
  @RequireFeature('radiology.radiology_category', 'edit')
  updateCategory(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticCategorySchema)) body: DiagnosticCategoryInput,
  ) {
    return this.diagnostics.updateCategory(user, branchId, id, { ...body, modality: 'radiology' });
  }

  @Delete('categories/:id')
  @HttpCode(204)
  @RequireFeature('radiology.radiology_category', 'delete')
  async removeCategory(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeCategory(user, branchId, 'radiology', id);
  }

  // Unit (Setup master)
  @Get('units')
  @RequireFeature('radiology.radiology_unit', 'view')
  listUnits(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.diagnostics.listUnits(branchId, 'radiology', q);
  }

  @Post('units')
  @RequireFeature('radiology.radiology_unit', 'add')
  createUnit(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(diagnosticUnitSchema)) body: DiagnosticUnitInput,
  ) {
    return this.diagnostics.createUnit(user, branchId, { ...body, modality: 'radiology' });
  }

  @Patch('units/:id')
  @RequireFeature('radiology.radiology_unit', 'edit')
  updateUnit(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(diagnosticUnitSchema)) body: DiagnosticUnitInput,
  ) {
    return this.diagnostics.updateUnit(user, branchId, id, { ...body, modality: 'radiology' });
  }

  @Delete('units/:id')
  @HttpCode(204)
  @RequireFeature('radiology.radiology_unit', 'delete')
  async removeUnit(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.diagnostics.removeUnit(user, branchId, 'radiology', id);
  }
}
