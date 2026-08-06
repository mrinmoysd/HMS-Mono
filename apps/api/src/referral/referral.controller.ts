import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  referralPaymentSchema,
  referralPersonSchema,
  type ListQuery,
  type ReferralPaymentInput,
  type ReferralPersonInput,
} from '@smart-hospital/shared';
import { ReferralService } from './referral.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('referral')
@ApiBearerAuth()
@Controller('referral')
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  // Persons
  @Get('persons')
  @RequireFeature('referral.referral_person', 'view')
  listPersons(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.referral.listPersons(branchId, q);
  }

  @Post('persons')
  @RequireFeature('referral.referral_person', 'add')
  createPerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(referralPersonSchema)) body: ReferralPersonInput) {
    return this.referral.createPerson(user, branchId, body);
  }

  @Patch('persons/:id')
  @RequireFeature('referral.referral_person', 'edit')
  updatePerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(referralPersonSchema)) body: ReferralPersonInput) {
    return this.referral.updatePerson(user, branchId, id, body);
  }

  @Delete('persons/:id')
  @HttpCode(204)
  @RequireFeature('referral.referral_person', 'delete')
  async removePerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.referral.removePerson(user, branchId, id);
  }

  // Patient detail (for Add Payment modal)
  @Get('patients/:patientId')
  @RequireFeature('referral.referral_commission', 'view')
  patientDetail(@BranchId() branchId: string, @Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.referral.patientDetail(branchId, patientId);
  }

  // Payments
  @Get('payments')
  @RequireFeature('referral.referral_payment', 'view')
  listPayments(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.referral.listPayments(branchId, q);
  }

  @Post('payments')
  @RequireFeature('referral.referral_payment', 'add')
  createPayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(referralPaymentSchema)) body: ReferralPaymentInput) {
    return this.referral.createPayment(user, branchId, body);
  }

  @Patch('payments/:id')
  @RequireFeature('referral.referral_payment', 'edit')
  updatePayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(referralPaymentSchema)) body: ReferralPaymentInput) {
    return this.referral.updatePayment(user, branchId, id, body);
  }

  @Delete('payments/:id')
  @HttpCode(204)
  @RequireFeature('referral.referral_payment', 'delete')
  async removePayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.referral.removePayment(user, branchId, id);
  }
}
