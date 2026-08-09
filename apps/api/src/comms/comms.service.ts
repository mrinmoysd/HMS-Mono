import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ContentShareDto,
  ContentShareInput,
  CredentialSendInput,
  EmailSendInput,
  ListQuery,
  LiveConsultationDto,
  LiveConsultationInput,
  NoticeDto,
  NoticeInput,
  Paginated,
  PatientCredentialDto,
  SmsSendInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { ChannelsService } from '../settings/channels/channels.service';
import type { RequestUser } from '../common/types/request-user';

/** Deterministic 6-char display token for the patient-credential table. */
function credToken(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) { out += chars[h % 36]; h = Math.floor(h / 36) + seed.charCodeAt(i % seed.length); }
  return out;
}

@Injectable()
export class CommsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly channels: ChannelsService,
  ) {}

  // ── Notice board ─────────────────────────────────────────────
  private async names(userIds: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private toNotice(n: { id: string; subject: string; body: string | null; roles: string[]; noticeDate: Date | null; publishOn: Date | null; date: Date; createdById: string | null }, nameMap: Map<string, string>): NoticeDto {
    return {
      id: n.id,
      subject: n.subject,
      body: n.body,
      roles: n.roles ?? [],
      noticeDate: n.noticeDate ? n.noticeDate.toISOString() : null,
      publishOn: n.publishOn ? n.publishOn.toISOString() : null,
      createdByName: n.createdById ? nameMap.get(n.createdById) ?? null : null,
      date: n.date.toISOString(),
    };
  }

  async listNotices(branchId: string, query: ListQuery): Promise<Paginated<NoticeDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.NotificationWhereInput = {
      branchId,
      type: 'notice',
      deletedAt: null,
      ...(query.search ? { subject: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    const nameMap = await this.names(rows.map((r) => r.createdById));
    return paginate(rows.map((n) => this.toNotice(n, nameMap)), total, query);
  }

  async createNotice(user: RequestUser, branchId: string, input: NoticeInput): Promise<NoticeDto> {
    const n = await this.prisma.notification.create({
      data: { branchId, type: 'notice', subject: input.subject, body: input.body || null, roles: input.roles, noticeDate: input.noticeDate, publishOn: input.publishOn, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'notification', entityId: n.id });
    const nameMap = await this.names([n.createdById]);
    return this.toNotice(n, nameMap);
  }

  async updateNotice(user: RequestUser, branchId: string, id: string, input: NoticeInput): Promise<NoticeDto> {
    const existing = await this.prisma.notification.findFirst({ where: { id, branchId, type: 'notice', deletedAt: null } });
    if (!existing) throw new NotFoundException('Notice not found');
    const n = await this.prisma.notification.update({
      where: { id },
      data: { subject: input.subject, body: input.body || null, roles: input.roles, noticeDate: input.noticeDate, publishOn: input.publishOn },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'notification', entityId: id });
    const nameMap = await this.names([n.createdById]);
    return this.toNotice(n, nameMap);
  }

  async removeNotice(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.notification.findFirst({ where: { id, branchId, type: 'notice', deletedAt: null } });
    if (!existing) throw new NotFoundException('Notice not found');
    await this.prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'notification', entityId: id });
  }

  // ── Send SMS / Email ─────────────────────────────────────────────────

  /**
   * Who a Group or Individual send actually reaches.
   *
   * Recipients with no address on that channel are counted as skipped rather
   * than attempted — "sent to 40 of 52, 12 have no mobile number" is a fact the
   * sender can act on; a silent 40 is not.
   */
  private async recipients(
    branchId: string,
    input: { mode: 'group' | 'individual'; roles: string[]; patientId?: string | null },
    field: 'phone' | 'email',
  ): Promise<{ addresses: string[]; skipped: number }> {
    if (input.mode === 'individual') {
      if (!input.patientId) return { addresses: [], skipped: 0 };
      const p = await this.prisma.patient.findFirst({
        where: { id: input.patientId, branchId, deletedAt: null },
        select: { phone: true, email: true },
      });
      const value = p?.[field] ?? '';
      return value ? { addresses: [value], skipped: 0 } : { addresses: [], skipped: p ? 1 : 0 };
    }

    const users = await this.prisma.user.findMany({
      where: { branchId, deletedAt: null, isActive: true, role: { slug: { in: input.roles } } },
      select: { phone: true, email: true },
    });
    const addresses = users.map((u) => u[field] ?? '').filter((v): v is string => !!v);
    return { addresses, skipped: users.length - addresses.length };
  }

  /**
   * Deliver through the branch's configured gateway, then record what happened.
   *
   * One failing recipient does not abandon the rest — a single bad number in a
   * fifty-person broadcast would otherwise silently truncate the send.
   */
  private async broadcast(
    branchId: string,
    channel: 'sms' | 'email',
    addresses: string[],
    msg: { subject: string; body: string },
  ): Promise<{ delivered: number; failed: number; detail: string }> {
    if (!addresses.length) return { delivered: 0, failed: 0, detail: 'No recipient had an address on this channel.' };
    let delivered = 0;
    let firstError = '';
    for (const to of addresses) {
      const res = await this.channels.send(branchId, channel, { to, body: msg.body, subject: msg.subject });
      if (res.ok) delivered += 1;
      else if (!firstError) firstError = res.detail;
    }
    const failed = addresses.length - delivered;
    const detail = failed ? firstError : `Delivered to ${delivered} recipient(s).`;
    return { delivered, failed, detail };
  }

  async sendSms(user: RequestUser, branchId: string, input: SmsSendInput) {
    const audience = input.mode === 'individual' ? 'Individual' : input.roles.join(', ');
    const { addresses, skipped } = await this.recipients(branchId, input, 'phone');
    const result = await this.broadcast(branchId, 'sms', addresses, { subject: input.subject, body: input.message });
    const n = await this.prisma.notification.create({
      data: { branchId, type: 'sms', subject: input.subject, body: input.message, roles: input.roles, audience, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'send_sms', entity: 'notification', entityId: n.id });
    return { ok: true as const, ...result, skipped };
  }

  async sendEmail(user: RequestUser, branchId: string, input: EmailSendInput) {
    const audience = input.mode === 'individual' ? 'Individual' : input.roles.join(', ');
    const { addresses, skipped } = await this.recipients(branchId, input, 'email');
    const result = await this.broadcast(branchId, 'email', addresses, { subject: input.subject, body: input.message });
    const n = await this.prisma.notification.create({
      data: { branchId, type: 'email', subject: input.subject, body: input.message, roles: input.roles, audience, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'send_email', entity: 'notification', entityId: n.id });
    return { ok: true as const, ...result, skipped };
  }

  // ── Patient credentials ──────────────────────────────────────
  async patientCredentials(branchId: string, query: ListQuery): Promise<Paginated<PatientCredentialDto>> {
    const { skip, take } = toPrismaPage(query);
    const where: Prisma.PatientWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { patientNo: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: { id: true, patientNo: true, name: true, email: true, phone: true } }),
      this.prisma.patient.count({ where }),
    ]);
    return paginate(
      rows.map((p) => ({
        id: p.id,
        patientNo: p.patientNo,
        name: p.name,
        email: p.email,
        phone: p.phone,
        username: `pat${p.patientNo}`,
        password: credToken(p.id),
      })),
      total,
      query,
    );
  }

  async sendCredential(user: RequestUser, branchId: string, input: CredentialSendInput): Promise<{ ok: true; sent: number }> {
    const patients = await this.prisma.patient.findMany({ where: { id: { in: input.patientIds }, branchId, deletedAt: null }, select: { id: true } });
    const n = await this.prisma.notification.create({
      data: { branchId, type: 'credential', subject: `Patient Credential (${input.credentialType})`, body: `Sent to ${patients.length} patient(s)`, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'send_credential', entity: 'notification', entityId: n.id });
    return { ok: true, sent: patients.length };
  }

  // ── Download Center ──────────────────────────────────────────
  async listContent(branchId: string, query: ListQuery): Promise<Paginated<ContentShareDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.ContentShareWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contentShare.findMany({ where, skip, take, orderBy }),
      this.prisma.contentShare.count({ where }),
    ]);
    const typeIds = rows.map((r) => r.contentTypeId).filter((x): x is string => !!x);
    const types = typeIds.length ? await this.prisma.contentType.findMany({ where: { id: { in: typeIds } } }) : [];
    const tMap = new Map(types.map((t) => [t.id, t.name]));
    return paginate(
      rows.map((c) => ({
        id: c.id,
        title: c.title,
        contentTypeName: c.contentTypeId ? tMap.get(c.contentTypeId) ?? null : null,
        sendToGroup: c.sendToGroup,
        fileUrl: c.fileUrl,
        description: c.description,
        shareDate: c.shareDate.toISOString(),
        validUpto: c.validUpto ? c.validUpto.toISOString() : null,
      })),
      total,
      query,
    );
  }

  async createContent(user: RequestUser, branchId: string, input: ContentShareInput): Promise<ContentShareDto> {
    const c = await this.prisma.contentShare.create({
      data: {
        branchId,
        title: input.title,
        contentTypeId: input.contentTypeId ?? null,
        sendToGroup: input.sendToGroup || null,
        fileUrl: input.fileUrl || null,
        description: input.description || null,
        validUpto: input.validUpto ?? null,
        sharedById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'content_share', entityId: c.id });
    return { id: c.id, title: c.title, contentTypeName: null, sendToGroup: c.sendToGroup, fileUrl: c.fileUrl, description: c.description, shareDate: c.shareDate.toISOString(), validUpto: c.validUpto ? c.validUpto.toISOString() : null };
  }

  // ── Live Consultation / Meeting ──────────────────────────────
  async listLive(branchId: string, kind: string, query: ListQuery): Promise<Paginated<LiveConsultationDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.LiveConsultationWhereInput = {
      branchId,
      kind,
      deletedAt: null,
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.liveConsultation.findMany({ where, skip, take, orderBy }),
      this.prisma.liveConsultation.count({ where }),
    ]);
    return paginate(rows.map(toLive), total, query);
  }

  async createLive(user: RequestUser, branchId: string, input: LiveConsultationInput): Promise<LiveConsultationDto> {
    const l = await this.prisma.liveConsultation.create({
      data: {
        branchId,
        kind: input.kind,
        title: input.title,
        description: input.description || null,
        date: input.date,
        durationMin: input.durationMin ?? null,
        apiUsed: input.apiUsed || 'Zoom',
        createdFor: input.createdFor || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'live_consultation', entityId: l.id });
    return toLive(l);
  }
}

function toLive(l: { id: string; kind: string; title: string; description: string | null; date: Date; durationMin: number | null; apiUsed: string | null; createdFor: string | null; status: string }): LiveConsultationDto {
  return { id: l.id, kind: l.kind, title: l.title, description: l.description, date: l.date.toISOString(), durationMin: l.durationMin, apiUsed: l.apiUsed, createdFor: l.createdFor, status: l.status };
}
