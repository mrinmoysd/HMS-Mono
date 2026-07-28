import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AddFindingRecordInput,
  AddSymptomRecordInput,
  AddVitalsInput,
  CurrentVitalDto,
  FindingDto,
  FindingInput,
  FindingRecordDto,
  SymptomRecordDto,
  SymptomTypeDto,
  SymptomTypeInput,
  TimelineEntryDto,
  TimelineEntryInput,
  UpdateTimelineInput,
  UpdateVitalInput,
  VitalMatrixDto,
  VitalStatus,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

/** Compute Low/Normal/High vs a vital type's reference range. */
export function vitalStatus(value: string, refMin: number | null, refMax: number | null): VitalStatus {
  const numeric = Number.parseFloat(value.split('/')[0] ?? ''); // systolic for BP
  if (Number.isNaN(numeric) || (refMin == null && refMax == null)) return 'na';
  if (refMin != null && numeric < refMin) return 'low';
  if (refMax != null && numeric > refMax) return 'high';
  return 'normal';
}

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Vitals ───────────────────────────────────────────────────
  async addVitals(user: RequestUser, branchId: string, input: AddVitalsInput): Promise<{ added: number }> {
    const rows = input.readings.map((r) => ({
      branchId,
      patientId: input.patientId,
      encounterType: input.encounterType ?? null,
      encounterId: input.encounterId ?? null,
      vitalTypeId: r.vitalTypeId,
      value: r.value,
      recordedAt: r.recordedAt ?? new Date(),
      createdById: user.id,
    }));
    await this.prisma.vitalReading.createMany({ data: rows });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'vitals', entityId: input.patientId, after: { count: rows.length } });
    return { added: rows.length };
  }

  async currentVitals(branchId: string, patientId: string): Promise<{ vitals: CurrentVitalDto[]; bmi: number | null }> {
    const types = await this.prisma.vitalType.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    const vitals: CurrentVitalDto[] = [];
    let height: number | null = null;
    let weight: number | null = null;
    for (const t of types) {
      const latest = await this.prisma.vitalReading.findFirst({
        where: { branchId, patientId, vitalTypeId: t.id, deletedAt: null },
        orderBy: { recordedAt: 'desc' },
      });
      if (!latest) continue;
      const refMin = t.refMin ? Number(t.refMin) : null;
      const refMax = t.refMax ? Number(t.refMax) : null;
      vitals.push({
        vitalTypeId: t.id,
        name: t.name,
        unit: t.unit,
        value: latest.value,
        status: vitalStatus(latest.value, refMin, refMax),
        recordedAt: latest.recordedAt.toISOString(),
      });
      const n = Number.parseFloat(latest.value);
      if (/height/i.test(t.name) && !Number.isNaN(n)) height = n;
      if (/weight/i.test(t.name) && !Number.isNaN(n)) weight = n;
    }
    const bmi = height && weight ? Math.round((weight / (height / 100) ** 2 + Number.EPSILON) * 100) / 100 : null;
    return { vitals, bmi };
  }

  async vitalMatrix(branchId: string, patientId: string): Promise<VitalMatrixDto> {
    const types = await this.prisma.vitalType.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    const readings = await this.prisma.vitalReading.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
    });
    const columns = types.map((t) => ({
      vitalTypeId: t.id,
      name: t.name,
      unit: t.unit,
      refMin: t.refMin ? Number(t.refMin) : null,
      refMax: t.refMax ? Number(t.refMax) : null,
    }));
    const byDate = new Map<string, VitalMatrixDto['rows'][number]>();
    for (const r of readings) {
      const day = r.recordedAt.toISOString().slice(0, 10);
      if (!byDate.has(day)) byDate.set(day, { date: day, cells: {} });
      const row = byDate.get(day)!;
      if (!row.cells[r.vitalTypeId]) {
        row.cells[r.vitalTypeId] = { id: r.id, value: r.value, recordedAt: r.recordedAt.toISOString() };
      }
    }
    return { columns, rows: [...byDate.values()] };
  }

  async updateVital(user: RequestUser, branchId: string, id: string, input: UpdateVitalInput): Promise<void> {
    const existing = await this.prisma.vitalReading.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Vital reading not found');
    await this.prisma.vitalReading.update({ where: { id }, data: { value: input.value } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'vitals', entityId: id });
  }

  async removeVital(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.vitalReading.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Vital reading not found');
    await this.prisma.vitalReading.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'vitals', entityId: id });
  }

  // ── Findings ─────────────────────────────────────────────────
  async listFindingRecords(branchId: string, patientId: string): Promise<FindingRecordDto[]> {
    const rows = await this.prisma.findingRecord.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ id: r.id, text: r.text, createdAt: r.createdAt.toISOString() }));
  }

  async addFindingRecord(user: RequestUser, branchId: string, input: AddFindingRecordInput): Promise<FindingRecordDto> {
    const r = await this.prisma.findingRecord.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        findingId: input.findingId ?? null,
        text: input.text,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'finding', entityId: r.id });
    return { id: r.id, text: r.text, createdAt: r.createdAt.toISOString() };
  }

  // ── Finding catalog (Setup master) ───────────────────────────
  async listFindings(branchId: string): Promise<FindingDto[]> {
    const rows = await this.prisma.finding.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { description: 'asc' },
      include: { category: true },
    });
    return rows.map((r) => ({ id: r.id, description: r.description, categoryId: r.categoryId, categoryName: r.category?.name ?? null }));
  }

  async createFinding(user: RequestUser, branchId: string, input: FindingInput): Promise<FindingDto> {
    const r = await this.prisma.finding.create({
      data: { branchId, categoryId: input.categoryId ?? null, description: input.description },
      include: { category: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'finding_master', entityId: r.id });
    return { id: r.id, description: r.description, categoryId: r.categoryId, categoryName: r.category?.name ?? null };
  }

  // ── Symptom-type catalog (Setup master) ──────────────────────
  async listSymptomTypes(branchId: string): Promise<SymptomTypeDto[]> {
    const rows = await this.prisma.symptomType.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { title: 'asc' },
      include: { head: true },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, description: r.description, headId: r.headId, headName: r.head?.name ?? null }));
  }

  async createSymptomType(user: RequestUser, branchId: string, input: SymptomTypeInput): Promise<SymptomTypeDto> {
    const r = await this.prisma.symptomType.create({
      data: { branchId, headId: input.headId ?? null, title: input.title, description: input.description || null },
      include: { head: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'symptom_master', entityId: r.id });
    return { id: r.id, title: r.title, description: r.description, headId: r.headId, headName: r.head?.name ?? null };
  }

  // ── Symptoms ─────────────────────────────────────────────────
  async listSymptomRecords(branchId: string, patientId: string): Promise<SymptomRecordDto[]> {
    const rows = await this.prisma.symptomRecord.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, description: r.description, createdAt: r.createdAt.toISOString() }));
  }

  async addSymptomRecord(user: RequestUser, branchId: string, input: AddSymptomRecordInput): Promise<SymptomRecordDto> {
    const r = await this.prisma.symptomRecord.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        symptomTypeId: input.symptomTypeId ?? null,
        title: input.title,
        description: input.description || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'symptom', entityId: r.id });
    return { id: r.id, title: r.title, description: r.description, createdAt: r.createdAt.toISOString() };
  }

  // ── Timeline ─────────────────────────────────────────────────
  async listTimeline(branchId: string, patientId: string): Promise<TimelineEntryDto[]> {
    const rows = await this.prisma.timelineEntry.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    return rows.map(toTimeline);
  }

  async addTimeline(user: RequestUser, branchId: string, input: TimelineEntryInput): Promise<TimelineEntryDto> {
    const t = await this.prisma.timelineEntry.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        title: input.title,
        date: input.date,
        description: input.description || null,
        fileUrl: input.fileUrl || null,
        visibleToPatient: input.visibleToPatient,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'timeline', entityId: t.id });
    return toTimeline(t);
  }

  async updateTimeline(
    user: RequestUser,
    branchId: string,
    id: string,
    input: UpdateTimelineInput,
  ): Promise<TimelineEntryDto> {
    const existing = await this.prisma.timelineEntry.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Timeline entry not found');
    const t = await this.prisma.timelineEntry.update({
      where: { id },
      data: {
        title: input.title,
        date: input.date,
        description: input.description || null,
        fileUrl: input.fileUrl || null,
        visibleToPatient: input.visibleToPatient,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'timeline', entityId: id });
    return toTimeline(t);
  }

  async removeTimeline(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.prisma.timelineEntry.updateMany({ where: { id, branchId }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'timeline', entityId: id });
  }
}

function toTimeline(t: { id: string; title: string; date: Date; description: string | null; fileUrl: string | null; visibleToPatient: boolean }): TimelineEntryDto {
  return { id: t.id, title: t.title, date: t.date.toISOString(), description: t.description, fileUrl: t.fileUrl, visibleToPatient: t.visibleToPatient };
}
