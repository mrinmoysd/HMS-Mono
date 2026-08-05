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
import { RequireFeature, RequireFeatureFor } from '../rbac/require-feature.decorator';
import type { ActionKey } from '@smart-hospital/shared';
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

/**
 * A blood issue and a component issue are separate features with different
 * grants — Doctor may create a blood issue (`f130f010`) but only read a
 * component one (`f110f010`) — and our endpoints carry the discriminator in
 * `?type=` for reads and `body.type` for writes rather than in the path.
 * Unrecognised input returns null, which denies.
 */
function issueFeature(type: unknown, action: ActionKey) {
  if (type === 'component') return { feature: 'blood_bank.issue_component', action };
  if (type === undefined || type === null || type === '' || type === 'blood') {
    return { feature: 'blood_bank.blood_issue', action };
  }
  return null;
}

@ApiTags('blood-bank')
@ApiBearerAuth()
@Controller('blood-bank')
export class BloodBankController {
  constructor(private readonly bloodBank: BloodBankService) {}

  // ── Legacy products (Setup masters) ──────────────────────────
  @Get('products')
  @RequireFeature('blood_bank.blood_bank_product', 'view')
  listProducts(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.bloodBank.listProducts(branchId, q);
  }

  @Post('products')
  @RequireFeature('blood_bank.blood_bank_product', 'add')
  createProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodProductSchema)) body: BloodProductInput) {
    return this.bloodBank.createProduct(user, branchId, body);
  }

  @Patch('products/:id')
  @RequireFeature('blood_bank.blood_bank_product', 'edit')
  updateProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(bloodProductSchema)) body: BloodProductInput) {
    return this.bloodBank.updateProduct(user, branchId, id, body);
  }

  @Delete('products/:id')
  @HttpCode(204)
  @RequireFeature('blood_bank.blood_bank_product', 'delete')
  async removeProduct(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.bloodBank.removeProduct(user, branchId, id);
  }

  // ── Donors ────────────────────────────────────────────────────
  @Get('donors')
  @RequireFeature('blood_bank.blood_donor', 'view')
  listDonors(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.bloodBank.listDonors(branchId, q);
  }

  @Get('donors/:id')
  @RequireFeature('blood_bank.blood_donor', 'view')
  getDonor(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.getDonor(branchId, id);
  }

  @Post('donors')
  @RequireFeature('blood_bank.blood_donor', 'add')
  createDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodDonorSchema)) body: BloodDonorInput) {
    return this.bloodBank.createDonor(user, branchId, body);
  }

  @Patch('donors/:id')
  @RequireFeature('blood_bank.blood_donor', 'edit')
  updateDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(bloodDonorSchema)) body: BloodDonorInput) {
    return this.bloodBank.updateDonor(user, branchId, id, body);
  }

  @Delete('donors/:id')
  @HttpCode(204)
  @RequireFeature('blood_bank.blood_donor', 'delete')
  async removeDonor(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.bloodBank.removeDonor(user, branchId, id);
  }

  // ── Bags (whole blood + components share the same table) ──────
  // Bags are Blood Stock, `b111b010` — view/add/delete, no edit.
  @Get('bags')
  @RequireFeature('blood_bank.blood_stock', 'view')
  listBags(@BranchId() branchId: string, @Query(new ZodValidationPipe(bagListQuerySchema)) q: BagListQuery) {
    return this.bloodBank.listBags(branchId, q);
  }

  @Get('bags/status')
  @RequireFeature('blood_bank.blood_stock', 'view')
  bagStatus(@BranchId() branchId: string) {
    return this.bloodBank.bagStatus(branchId);
  }

  @Post('bags')
  @RequireFeature('blood_bank.blood_stock', 'add')
  createBag(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodBagSchema)) body: BloodBagInput) {
    return this.bloodBank.createBag(user, branchId, body);
  }

  @Delete('bags/:id')
  @HttpCode(204)
  @RequireFeature('blood_bank.blood_stock', 'delete')
  removeBag(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.removeBag(user, branchId, id);
  }

  @Post('components')
  // Splitting a bag into components is an add on Blood Bank Components.
  @RequireFeature('blood_bank.blood_bank_components', 'add')
  splitComponents(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodComponentSplitSchema)) body: BloodComponentSplitInput) {
    return this.bloodBank.splitComponents(user, branchId, body);
  }

  // ── Issues (blood / component) ─────────────────────────────────
  @Get('issues')
  @RequireFeatureFor((c) => issueFeature(c.query.type, 'view'))
  listIssues(@BranchId() branchId: string, @Query(new ZodValidationPipe(issueListQuerySchema)) q: IssueListQuery) {
    return this.bloodBank.listIssues(branchId, q.type === 'component' ? 'component' : 'blood', q);
  }

  /** Declared before `issues/:id` so the literal segment wins the route match. */
  @Get('issues/next-no')
  // Read by both issue forms; the blood right is the weaker of the two.
  @RequireFeature('blood_bank.blood_issue', 'add')
  nextIssueNo(@BranchId() branchId: string, @Query('patientId') patientId?: string) {
    return this.bloodBank.nextIssueNo(branchId, patientId);
  }

  @Get('issues/:id')
  @RequireFeatureFor((c) => issueFeature(c.query.type, 'view'))
  getIssue(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.getIssue(branchId, id);
  }

  @Post('issues')
  @RequireFeatureFor((c) => issueFeature(c.body.type, 'add'))
  issue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(bloodIssueSchema)) body: BloodIssueInput) {
    return this.bloodBank.issue(user, branchId, body);
  }

  @Patch('issues/:id')
  @RequireFeatureFor((c) => issueFeature(c.body.type, 'edit'))
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
  @RequireFeatureFor((c) => issueFeature(c.query.type, 'delete'))
  deleteIssue(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bloodBank.deleteIssue(user, branchId, id);
  }
}
