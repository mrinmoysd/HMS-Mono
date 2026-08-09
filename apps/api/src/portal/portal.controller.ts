import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  portalBookSchema,
  portalRegisterSchema,
  paymentOrderSchema,
  paymentVerifySchema,
  type PortalBookInput,
  type PortalRegisterInput,
  type PaymentOrderInput,
  type PaymentVerifyInput,
} from '@smart-hospital/shared';
import { PortalService } from './portal.service';
import { Public } from '../common/decorators/public.decorator';
import { Authenticated } from '../rbac/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';
import { PatientPanelGuard } from './patient-panel.guard';


/**
 * Patient self-service portal. Every endpoint (except register) is scoped to the
 * authenticated patient's own records via PortalService.requirePatient — the
 * hard data boundary for the portal (docs/PERMISSION_MATRIX §4, Patient role).
 *
 * That boundary is why these carry @Authenticated rather than a feature key.
 * The staff permission model does not describe them — a patient holds no
 * feature grants at all — and gating them on one would deny every patient. The
 * check that matters here is ownership, and it lives in the service.
 */
@ApiTags('portal')
@UseGuards(PatientPanelGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Public()
  @Post('register')
  @HttpCode(200)
  register(@Body(new ZodValidationPipe(portalRegisterSchema)) body: PortalRegisterInput) {
    return this.portal.register(body);
  }

  @Authenticated()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.portal.profile(user);
  }

  @Authenticated()
  @Get('doctors')
  doctors(@CurrentUser() user: RequestUser) {
    return this.portal.doctors(user);
  }

  @Authenticated()
  @Get('appointments')
  appointments(@CurrentUser() user: RequestUser) {
    return this.portal.listAppointments(user);
  }

  @Authenticated()
  @Post('appointments')
  book(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(portalBookSchema)) body: PortalBookInput) {
    return this.portal.book(user, body);
  }

  @Authenticated()
  @Get('visits')
  visits(@CurrentUser() user: RequestUser) {
    return this.portal.visits(user);
  }

  @Authenticated()
  @Get('invoices')
  invoices(@CurrentUser() user: RequestUser) {
    return this.portal.listInvoices(user);
  }

  /**
   * Online payment, in two steps.
   *
   * It replaced a single `pay` endpoint that recorded whatever amount the
   * caller posted, with no gateway involved — a patient could settle their own
   * hospital bill by asking. Opening an order and then verifying it with the
   * gateway is the whole point: nothing is written until the money is
   * confirmed by the party that actually holds it.
   */
  @Authenticated()
  @Post('invoices/:id/pay/order')
  @HttpCode(200)
  payOrder(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(paymentOrderSchema)) body: PaymentOrderInput,
  ) {
    return this.portal.payOrder(user, id, body.amount);
  }

  @Authenticated()
  @Post('invoices/:id/pay/verify')
  @HttpCode(200)
  payVerify(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(paymentVerifySchema)) body: PaymentVerifyInput,
  ) {
    return this.portal.payVerify(user, id, body);
  }

  @Authenticated()
  @Get('notifications')
  notifications(@CurrentUser() user: RequestUser) {
    return this.portal.notifications(user);
  }
}
