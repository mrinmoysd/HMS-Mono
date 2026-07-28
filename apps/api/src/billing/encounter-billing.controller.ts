import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addChargesSchema,
  addEncounterPaymentSchema,
  type AddChargesInput,
  type AddEncounterPaymentInput,
} from '@smart-hospital/shared';
import { EncounterBillingService } from './encounter-billing.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('encounter-billing')
export class EncounterBillingController {
  constructor(private readonly billing: EncounterBillingService) {}

  @Get(':type/:id')
  @RequirePermission('billing', 'view')
  get(@BranchId() branchId: string, @Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getBilling(branchId, type, id);
  }

  @Post(':type/:id/charges')
  @HttpCode(200)
  @RequirePermission('billing', 'edit')
  addCharges(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addChargesSchema)) body: AddChargesInput,
  ) {
    return this.billing.addCharges(user, branchId, type, id, body);
  }

  @Post(':type/:id/payments')
  @HttpCode(200)
  @RequirePermission('billing', 'edit')
  addPayment(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addEncounterPaymentSchema)) body: AddEncounterPaymentInput,
  ) {
    return this.billing.addPayment(user, branchId, type, id, body);
  }
}
