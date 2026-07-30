import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  bloodBagSchema,
  bloodComponentSplitSchema,
  bloodDonorSchema,
  bloodIssueSchema,
  bloodIssueUpdateSchema,
  bloodProductSchema,
  listQuerySchema,
  type BloodBagInput,
  type BloodComponentSplitInput,
  type BloodDonorInput,
  type BloodIssueInput,
  type BloodIssueUpdateInput,
  type BloodProductInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { BloodBankService } from './blood-bank.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

const bagListQuerySchema = listQuerySchema.extend({
  kind: z.enum(['blood', 'component']).optional(),
  bloodGroup: z.string().optional(),
  status: z.string().optional(),
});
type BagListQuery = z.infer<typeof bagListQuerySchema>;

const issueListQuerySchema = listQuerySchema.extend({
  type: z.enum(['blood', 'component']).optional(),
});
type IssueListQuery = z.infer<typeof issueListQuerySchema>;

@ApiTags('blood-bank')
@ApiBearerAuth()
@Controller('blood-bank')
export class BloodBankController {
  constructor(private readonly bloodBank: BloodBankService) {}

  // ── Legacy products (Setup masters) ──────────────────────────
  @Get('products')
  @RequirePermission('blood_bank', 'view')
  listProducts(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.bloodBank.listProducts(branchId, q);
  }

  @Post('products')
  @RequirePermission('blood_bank', 'add')
  createProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodProductSchema)) body: BloodProductInput) {
    return this.bloodBank.createProduct(user, branchId, body);
  }

  @Patch('products/:id')
  @RequirePermission('blood_bank', 'edit')
  updateProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(bloodProductSchema)) body: BloodProductInput) {
    return this.bloodBank.updateProduct(user, branchId, id, body);
  }

  @Delete('products/:id')
  @HttpCode(204)
  @RequirePermission('blood_bank', 'delete')
  async removeProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.bloodBank.removeProduct(user, branchId, id);
  }

  // ── Donors ────────────────────────────────────────────────────
  @Get('donors')
  @RequirePermission('blood_bank', 'view')
  listDonors(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.bloodBank.listDonors(branchId, q);
  }

  @Get('donors/:id')
  @RequirePermission('blood_bank', 'view')
  getDonor(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.getDonor(branchId, id);
  }

  @Post('donors')
  @RequirePermission('blood_bank', 'add')
  createDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodDonorSchema)) body: BloodDonorInput) {
    return this.bloodBank.createDonor(user, branchId, body);
  }

  @Patch('donors/:id')
  @RequirePermission('blood_bank', 'edit')
  updateDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(bloodDonorSchema)) body: BloodDonorInput) {
    return this.bloodBank.updateDonor(user, branchId, id, body);
  }

  @Delete('donors/:id')
  @HttpCode(204)
  @RequirePermission('blood_bank', 'delete')
  async removeDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.bloodBank.removeDonor(user, branchId, id);
  }

  // ── Bags (whole blood + components share the same table) ──────
  @Get('bags')
  @RequirePermission('blood_bank', 'view')
  listBags(@BranchId() branchId: string, @Query(new ZodValidationPipe(bagListQuerySchema)) q: BagListQuery) {
    return this.bloodBank.listBags(branchId, q);
  }

  @Get('bags/status')
  @RequirePermission('blood_bank', 'view')
  bagStatus(@BranchId() branchId: string) {
    return this.bloodBank.bagStatus(branchId);
  }

  @Post('bags')
  @RequirePermission('blood_bank', 'add')
  createBag(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodBagSchema)) body: BloodBagInput) {
    return this.bloodBank.createBag(user, branchId, body);
  }

  @Delete('bags/:id')
  @HttpCode(204)
  @RequirePermission('blood_bank', 'delete')
  removeBag(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.removeBag(user, branchId, id);
  }

  @Post('components')
  @RequirePermission('blood_bank', 'add')
  splitComponents(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodComponentSplitSchema)) body: BloodComponentSplitInput) {
    return this.bloodBank.splitComponents(user, branchId, body);
  }

  // ── Issues (blood / component) ─────────────────────────────────
  @Get('issues')
  @RequirePermission('blood_bank', 'view')
  listIssues(@BranchId() branchId: string, @Query(new ZodValidationPipe(issueListQuerySchema)) q: IssueListQuery) {
    return this.bloodBank.listIssues(branchId, q.type === 'component' ? 'component' : 'blood', q);
  }

  /** Declared before `issues/:id` so the literal segment wins the route match. */
  @Get('issues/next-no')
  @RequirePermission('blood_bank', 'add')
  nextIssueNo(@BranchId() branchId: string, @Query('patientId') patientId?: string) {
    return this.bloodBank.nextIssueNo(branchId, patientId);
  }

  @Get('issues/:id')
  @RequirePermission('blood_bank', 'view')
  getIssue(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.getIssue(branchId, id);
  }

  @Post('issues')
  @RequirePermission('blood_bank', 'add')
  issue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodIssueSchema)) body: BloodIssueInput) {
    return this.bloodBank.issue(user, branchId, body);
  }

  @Patch('issues/:id')
  @RequirePermission('blood_bank', 'edit')
  updateIssue(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(bloodIssueUpdateSchema)) body: BloodIssueUpdateInput,
  ) {
    return this.bloodBank.updateIssue(user, branchId, id, body);
  }

  @Delete('issues/:id')
  @HttpCode(204)
  @RequirePermission('blood_bank', 'delete')
  deleteIssue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.deleteIssue(user, branchId, id);
  }
}
