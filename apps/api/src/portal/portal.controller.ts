import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  portalBookSchema,
  portalRegisterSchema,
  type PortalBookInput,
  type PortalRegisterInput,
} from '@smart-hospital/shared';
import { PortalService } from './portal.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

const paySchema = z.object({ amount: z.coerce.number().min(0) });

/**
 * Patient self-service portal. Every endpoint (except register) is scoped to the
 * authenticated patient's own records via PortalService.requirePatient — the
 * hard data boundary for the portal (docs/PERMISSION_MATRIX §4, Patient role).
 */
@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Public()
  @Post('register')
  @HttpCode(200)
  register(@Body(new ZodValidationPipe(portalRegisterSchema)) body: PortalRegisterInput) {
    return this.portal.register(body);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.portal.profile(user);
  }

  @Get('doctors')
  doctors(@CurrentUser() user: RequestUser) {
    return this.portal.doctors(user);
  }

  @Get('appointments')
  appointments(@CurrentUser() user: RequestUser) {
    return this.portal.listAppointments(user);
  }

  @Post('appointments')
  book(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(portalBookSchema)) body: PortalBookInput) {
    return this.portal.book(user, body);
  }

  @Get('visits')
  visits(@CurrentUser() user: RequestUser) {
    return this.portal.visits(user);
  }

  @Get('invoices')
  invoices(@CurrentUser() user: RequestUser) {
    return this.portal.listInvoices(user);
  }

  @Post('invoices/:id/pay')
  @HttpCode(200)
  pay(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(paySchema)) body: { amount: number },
  ) {
    return this.portal.pay(user, id, body.amount);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: RequestUser) {
    return this.portal.notifications(user);
  }
}
