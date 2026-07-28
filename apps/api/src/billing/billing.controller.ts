import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { listQuerySchema, paymentSchema, type ListQuery, type PaymentInput } from '@smart-hospital/shared';
import { InvoiceService } from './invoice.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('invoices')
export class BillingController {
  constructor(private readonly invoices: InvoiceService) {}

  @Get()
  @RequirePermission('billing', 'view')
  list(
    @BranchId() branchId: string,
    @Query('module') module: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.invoices.list(branchId, module, query);
  }

  @Get('by-case/:caseNo')
  @RequirePermission('billing', 'view')
  byCase(@BranchId() branchId: string, @Param('caseNo') caseNo: string) {
    return this.invoices.findByCaseNo(branchId, caseNo);
  }

  @Get(':id')
  @RequirePermission('billing', 'view')
  get(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.get(branchId, id);
  }

  @Post(':id/payments')
  @HttpCode(200)
  @RequirePermission('billing', 'edit')
  addPayment(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(paymentSchema)) body: PaymentInput,
  ) {
    return this.invoices.addPayment(user, branchId, id, body.amount, body.mode, body.reference);
  }

  @Delete(':id/payments/:paymentId')
  @RequirePermission('billing', 'edit')
  removePayment(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.invoices.removePayment(user, branchId, id, paymentId);
  }
}
