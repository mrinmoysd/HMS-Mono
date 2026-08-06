import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  phoneCallSchema,
  postalComplaintSchema,
  visitorSchema,
  type ListQuery,
  type PhoneCallInput,
  type PostalComplaintInput,
  type VisitorInput,
} from '@smart-hospital/shared';
import { FrontOfficeService } from './front-office.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('front-office')
@ApiBearerAuth()
@Controller('front-office')
export class FrontOfficeController {
  constructor(private readonly fo: FrontOfficeService) {}

  @Get('visitors')
  @RequireFeature('front_office.visitor_book', 'view')
  listVisitors(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.fo.listVisitors(b, q);
  }
  @Post('visitors')
  @RequireFeature('front_office.visitor_book', 'add')
  createVisitor(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(visitorSchema)) body: VisitorInput) {
    return this.fo.createVisitor(u, b, body);
  }

  @Get('calls')
  @RequireFeature('front_office.phone_call_log', 'view')
  listCalls(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.fo.listCalls(b, q);
  }
  @Post('calls')
  @RequireFeature('front_office.phone_call_log', 'add')
  createCall(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(phoneCallSchema)) body: PhoneCallInput) {
    return this.fo.createCall(u, b, body);
  }

  @Get('complaints')
  @RequireFeature('front_office.complain', 'view')
  listComplaints(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.fo.listComplaints(b, q);
  }
  @Post('complaints')
  @RequireFeature('front_office.complain', 'add')
  createComplaint(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(postalComplaintSchema)) body: PostalComplaintInput) {
    return this.fo.createComplaint(u, b, body);
  }
}
