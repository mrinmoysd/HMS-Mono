import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ListQuery,
  Paginated,
  PhoneCallDto,
  PhoneCallInput,
  PostalComplaintDto,
  PostalComplaintInput,
  VisitorDto,
  VisitorInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class FrontOfficeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listVisitors(branchId: string, query: ListQuery): Promise<Paginated<VisitorDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.VisitorWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.visitor.findMany({ where, skip, take, orderBy }),
      this.prisma.visitor.count({ where }),
    ]);
    // resolve purpose names
    const purposeIds = rows.map((r) => r.purposeId).filter((x): x is string => !!x);
    const purposes = purposeIds.length
      ? await this.prisma.frontOfficePurpose.findMany({ where: { id: { in: purposeIds } } })
      : [];
    const pMap = new Map(purposes.map((p) => [p.id, p.name]));
    return paginate(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        purposeName: r.purposeId ? pMap.get(r.purposeId) ?? null : null,
        visitTo: r.visitTo,
        phone: r.phone,
        date: r.date.toISOString(),
        note: r.note,
      })),
      total,
      query,
    );
  }

  async createVisitor(user: RequestUser, branchId: string, input: VisitorInput): Promise<VisitorDto> {
    const v = await this.prisma.visitor.create({
      data: {
        branchId,
        name: input.name,
        purposeId: input.purposeId ?? null,
        visitTo: input.visitTo || null,
        phone: input.phone || null,
        date: input.date,
        inTime: new Date(),
        note: input.note || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'visitor', entityId: v.id });
    return { id: v.id, name: v.name, purposeName: null, visitTo: v.visitTo, phone: v.phone, date: v.date.toISOString(), note: v.note };
  }

  async listCalls(branchId: string, query: ListQuery): Promise<Paginated<PhoneCallDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.PhoneCallWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.phoneCall.findMany({ where, skip, take, orderBy }),
      this.prisma.phoneCall.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, type: r.type, date: r.date.toISOString(), note: r.note })),
      total,
      query,
    );
  }

  async createCall(user: RequestUser, branchId: string, input: PhoneCallInput): Promise<PhoneCallDto> {
    const c = await this.prisma.phoneCall.create({
      data: { branchId, name: input.name, phone: input.phone || null, type: input.type, date: input.date, note: input.note || null, createdById: user.id },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'phone_call', entityId: c.id });
    return { id: c.id, name: c.name, phone: c.phone, type: c.type, date: c.date.toISOString(), note: c.note };
  }

  async listComplaints(branchId: string, query: ListQuery): Promise<Paginated<PostalComplaintDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.PostalComplaintWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.postalComplaint.findMany({ where, skip, take, orderBy }),
      this.prisma.postalComplaint.count({ where }),
    ]);
    const typeIds = rows.map((r) => r.complaintTypeId).filter((x): x is string => !!x);
    const types = typeIds.length ? await this.prisma.complaintType.findMany({ where: { id: { in: typeIds } } }) : [];
    const tMap = new Map(types.map((t) => [t.id, t.name]));
    return paginate(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        complaintTypeName: r.complaintTypeId ? tMap.get(r.complaintTypeId) ?? null : null,
        source: r.source,
        phone: r.phone,
        description: r.description,
        date: r.date.toISOString(),
        actionTaken: r.actionTaken,
      })),
      total,
      query,
    );
  }

  async createComplaint(user: RequestUser, branchId: string, input: PostalComplaintInput): Promise<PostalComplaintDto> {
    const c = await this.prisma.postalComplaint.create({
      data: {
        branchId,
        name: input.name || null,
        complaintTypeId: input.complaintTypeId ?? null,
        source: input.source || null,
        phone: input.phone || null,
        description: input.description,
        date: input.date,
        actionTaken: input.actionTaken || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'postal_complaint', entityId: c.id });
    return { id: c.id, name: c.name, complaintTypeName: null, source: c.source, phone: c.phone, description: c.description, date: c.date.toISOString(), actionTaken: c.actionTaken };
  }
}
