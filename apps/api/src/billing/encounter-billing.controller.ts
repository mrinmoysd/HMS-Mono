import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addChargesSchema,
  addEncounterPaymentSchema,
  type AddChargesInput,
  type AddEncounterPaymentInput,
} from '@smart-hospital/shared';
import { EncounterBillingService } from './encounter-billing.service';
import { RequireFeatureFor } from '../rbac/require-feature.decorator';
import { billingFeature, billingPaymentFeature } from './billing-features';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('encounter-billing')
export class EncounterBillingController {
  constructor(private readonly billing: EncounterBillingService) {}

  // `:type` is in the URL here, so the per-module feature is known before the
  // handler runs and the guard can resolve it. An unrecognised type resolves to
  // null, which denies.
  @Get(':type/:id')
  @RequireFeatureFor((c) => billingFeature(c.params.type, 'view'))
  get(@BranchId() branchId: string, @Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getBilling(branchId, type, id);
  }

  @Post(':type/:id/charges')
  @HttpCode(200)
  // Adding a charge changes what the bill totals, so it is gated on the bill
  // feature — which is view-only in the spec. Nobody may edit a bill; see the
  // Billing note in docs/ROLE_PERMISSION_PARITY.md.
  @RequireFeatureFor((c) => billingFeature(c.params.type, 'view'))
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
  // Recording a payment is `add` on the module's Billing Payment feature.
  @RequireFeatureFor((c) => billingPaymentFeature(c.params.type, 'add'))
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
