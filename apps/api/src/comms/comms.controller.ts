import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  contentShareSchema,
  credentialSendSchema,
  emailSendSchema,
  listQuerySchema,
  liveConsultationSchema,
  noticeSchema,
  smsSendSchema,
  type ContentShareInput,
  type CredentialSendInput,
  type EmailSendInput,
  type ListQuery,
  type LiveConsultationInput,
  type NoticeInput,
  type SmsSendInput,
} from '@smart-hospital/shared';
import { CommsService } from './comms.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('comms')
@ApiBearerAuth()
@Controller()
export class CommsController {
  constructor(private readonly comms: CommsService) {}

  // Messaging — notice board
  @Get('notifications')
  @RequirePermission('messaging', 'view')
  listNotices(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.comms.listNotices(b, q);
  }
  @Post('notifications')
  @RequirePermission('messaging', 'add')
  createNotice(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(noticeSchema)) body: NoticeInput) {
    return this.comms.createNotice(u, b, body);
  }
  @Patch('notifications/:id')
  @RequirePermission('messaging', 'edit')
  updateNotice(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(noticeSchema)) body: NoticeInput) {
    return this.comms.updateNotice(u, b, id, body);
  }
  @Delete('notifications/:id')
  @HttpCode(204)
  @RequirePermission('messaging', 'delete')
  async removeNotice(@CurrentUser() u: RequestUser, @BranchId() b: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.comms.removeNotice(u, b, id);
  }

  // Messaging — send SMS / Email
  @Post('messaging/sms')
  @RequirePermission('messaging', 'add')
  sendSms(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(smsSendSchema)) body: SmsSendInput) {
    return this.comms.sendSms(u, b, body);
  }
  @Post('messaging/email')
  @RequirePermission('messaging', 'add')
  sendEmail(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(emailSendSchema)) body: EmailSendInput) {
    return this.comms.sendEmail(u, b, body);
  }

  // Messaging — patient credentials
  @Get('messaging/patient-credentials')
  @RequirePermission('messaging', 'view')
  patientCredentials(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.comms.patientCredentials(b, q);
  }
  @Post('messaging/credential')
  @RequirePermission('messaging', 'add')
  sendCredential(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(credentialSendSchema)) body: CredentialSendInput) {
    return this.comms.sendCredential(u, b, body);
  }

  // Download center
  @Get('content')
  @RequirePermission('download_center', 'view')
  listContent(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.comms.listContent(b, q);
  }
  @Post('content')
  @RequirePermission('download_center', 'add')
  createContent(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(contentShareSchema)) body: ContentShareInput) {
    return this.comms.createContent(u, b, body);
  }

  // Live consultation / meeting
  @Get('live')
  @RequirePermission('live_consultation', 'view')
  listLive(@BranchId() b: string, @Query('kind') kind: string | undefined, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.comms.listLive(b, kind === 'meeting' ? 'meeting' : 'consultation', q);
  }
  @Post('live')
  @RequirePermission('live_consultation', 'add')
  createLive(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(liveConsultationSchema)) body: LiveConsultationInput) {
    return this.comms.createLive(u, b, body);
  }
}
