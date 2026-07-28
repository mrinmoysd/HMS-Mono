import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AddConsultantRegisterInput,
  AddNurseNoteInput,
  ConsultantRegisterDto,
  NurseNoteDto,
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
export class IpdClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private scope(q: EncounterScope) {
    return {
      patientId: q.patientId,
      deletedAt: null,
      ...(q.encounterType ? { encounterType: q.encounterType } : {}),
      ...(q.encounterId ? { encounterId: q.encounterId } : {}),
    };
  }

  // ── Nurse Notes ────────────────────────────────────────────
  async listNurseNotes(branchId: string, q: EncounterScope): Promise<NurseNoteDto[]> {
    const rows = await this.prisma.nurseNote.findMany({ where: { branchId, ...this.scope(q) }, orderBy: { createdAt: 'desc' } });
    const names = await this.names(rows.map((r) => r.createdById));
    return rows.map((r) => ({
      id: r.id,
      nurseName: r.nurseName,
      note: r.note,
      comment: r.comment,
      createdByName: r.createdById ? names.get(r.createdById) ?? null : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async addNurseNote(user: RequestUser, branchId: string, input: AddNurseNoteInput): Promise<NurseNoteDto> {
    const r = await this.prisma.nurseNote.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        nurseName: input.nurseName || null,
        note: input.note,
        comment: input.comment || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'nurse_note', entityId: r.id });
    return { id: r.id, nurseName: r.nurseName, note: r.note, comment: r.comment, createdByName: user.name ?? null, createdAt: r.createdAt.toISOString() };
  }

  // ── Consultant Register ────────────────────────────────────
  async listConsultantRegister(branchId: string, q: EncounterScope): Promise<ConsultantRegisterDto[]> {
    const rows = await this.prisma.consultantRegister.findMany({ where: { branchId, ...this.scope(q) }, orderBy: { appliedDate: 'desc' } });
    return rows.map(toConsultantDto);
  }

  async addConsultantRegister(user: RequestUser, branchId: string, input: AddConsultantRegisterInput): Promise<ConsultantRegisterDto> {
    const r = await this.prisma.consultantRegister.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        doctorName: input.doctorName,
        instruction: input.instruction || null,
        appliedDate: input.appliedDate,
        consultantDate: input.consultantDate ?? null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'consultant_register', entityId: r.id });
    return toConsultantDto(r);
  }
}

function toConsultantDto(r: Prisma.ConsultantRegisterGetPayload<object>): ConsultantRegisterDto {
  return {
    id: r.id,
    doctorName: r.doctorName,
    instruction: r.instruction,
    appliedDate: r.appliedDate.toISOString(),
    consultantDate: r.consultantDate ? r.consultantDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}
