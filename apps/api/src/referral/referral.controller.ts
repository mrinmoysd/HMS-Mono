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
import { RequirePermission } from '../rbac/require-permission.decorator';
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
  @RequirePermission('referral', 'view')
  listPersons(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.referral.listPersons(branchId, q);
  }

  @Post('persons')
  @RequirePermission('referral', 'add')
  createPerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(referralPersonSchema)) body: ReferralPersonInput) {
    return this.referral.createPerson(user, branchId, body);
  }

  @Patch('persons/:id')
  @RequirePermission('referral', 'edit')
  updatePerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(referralPersonSchema)) body: ReferralPersonInput) {
    return this.referral.updatePerson(user, branchId, id, body);
  }

  @Delete('persons/:id')
  @HttpCode(204)
  @RequirePermission('referral', 'delete')
  async removePerson(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.referral.removePerson(user, branchId, id);
  }

  // Patient detail (for Add Payment modal)
  @Get('patients/:patientId')
  @RequirePermission('referral', 'view')
  patientDetail(@BranchId() branchId: string, @Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.referral.patientDetail(branchId, patientId);
  }

  // Payments
  @Get('payments')
  @RequirePermission('referral', 'view')
  listPayments(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.referral.listPayments(branchId, q);
  }

  @Post('payments')
  @RequirePermission('referral', 'add')
  createPayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Body(new ZodValidationPipe(referralPaymentSchema)) body: ReferralPaymentInput) {
    return this.referral.createPayment(user, branchId, body);
  }

  @Patch('payments/:id')
  @RequirePermission('referral', 'edit')
  updatePayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(referralPaymentSchema)) body: ReferralPaymentInput) {
    return this.referral.updatePayment(user, branchId, id, body);
  }

  @Delete('payments/:id')
  @HttpCode(204)
  @RequirePermission('referral', 'delete')
  async removePayment(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.referral.removePayment(user, branchId, id);
  }
}
