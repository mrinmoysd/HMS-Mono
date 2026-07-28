import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateLiveConsultInput,
  CreateOperationInput,
  EncounterLiveConsultDto,
  OperationRecordDto,
  UpdateLiveConsultStatusInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

interface EncounterScope {
  patientId: string;
  encounterType?: 'opd' | 'ipd';
  encounterId?: string;
}

@Injectable()
export class OperationsClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private scope(q: EncounterScope) {
    return {
      patientId: q.patientId,
      deletedAt: null,
      ...(q.encounterType ? { encounterType: q.encounterType } : {}),
      ...(q.encounterId ? { encounterId: q.encounterId } : {}),
    };
  }

  // ── Operations (OT) ────────────────────────────────────────
  async listOperations(branchId: string, q: EncounterScope): Promise<OperationRecordDto[]> {
    const rows = await this.prisma.operationRecord.findMany({
      where: { branchId, ...this.scope(q) },
      orderBy: { date: 'desc' },
    });
    return rows.map(toOperationDto);
  }

  async createOperation(user: RequestUser, branchId: string, input: CreateOperationInput): Promise<OperationRecordDto> {
    const row = await this.prisma.operationRecord.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        category: input.category || null,
        name: input.name,
        date: input.date,
        consultant: input.consultant || null,
        assistant1: input.assistant1 || null,
        assistant2: input.assistant2 || null,
        anesthetist: input.anesthetist || null,
        anesthesiaType: input.anesthesiaType || null,
        otTechnician: input.otTechnician || null,
        otAssistant: input.otAssistant || null,
        result: input.result || null,
        refNo: input.refNo || null,
        remark: input.remark || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'operation', entityId: row.id });
    return toOperationDto(row);
  }

  // ── Live Consultation (encounter-scoped) ───────────────────
  async listLiveConsults(branchId: string, q: EncounterScope): Promise<EncounterLiveConsultDto[]> {
    const rows = await this.prisma.liveConsultation.findMany({
      where: { branchId, ...this.scope(q) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toLiveConsultDto);
  }

  async createLiveConsult(user: RequestUser, branchId: string, input: CreateLiveConsultInput): Promise<EncounterLiveConsultDto> {
    const row = await this.prisma.liveConsultation.create({
      data: {
        branchId,
        kind: 'consultation',
        title: input.title,
        date: input.scheduledAt ?? new Date(),
        createdFor: input.doctorName || null,
        status: 'awaited',
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        joinUrl: input.joinUrl || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'live_consult', entityId: row.id });
    return toLiveConsultDto(row);
  }

  async updateLiveConsultStatus(user: RequestUser, branchId: string, id: string, input: UpdateLiveConsultStatusInput): Promise<EncounterLiveConsultDto> {
    const existing = await this.prisma.liveConsultation.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Live consultation not found');
    const row = await this.prisma.liveConsultation.update({ where: { id }, data: { status: input.status } });
    await this.audit.record({ branchId, userId: user.id, action: 'status', entity: 'live_consult', entityId: id, after: { status: input.status } });
    return toLiveConsultDto(row);
  }
}

function toOperationDto(r: Prisma.OperationRecordGetPayload<object>): OperationRecordDto {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    date: r.date.toISOString(),
    consultant: r.consultant,
    assistant1: r.assistant1,
    assistant2: r.assistant2,
    anesthetist: r.anesthetist,
    anesthesiaType: r.anesthesiaType,
    otTechnician: r.otTechnician,
    otAssistant: r.otAssistant,
    result: r.result,
    refNo: r.refNo,
    remark: r.remark,
  };
}

function toLiveConsultDto(r: Prisma.LiveConsultationGetPayload<object>): EncounterLiveConsultDto {
  return {
    id: r.id,
    title: r.title,
    doctorName: r.createdFor,
    status: r.status,
    joinUrl: r.joinUrl,
    scheduledAt: r.date ? r.date.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}
