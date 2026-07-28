import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AddMedicationInput,
  CreatePrescriptionInput,
  LabInvestigationDto,
  LabStatus,
  MedicationDoseDto,
  OrderLabInput,
  PrescriptionDto,
  ReportLabInput,
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
export class DiagnosticsClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Resolve staff names for the *ById columns (models keep plain FK ids, no relations). */
  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private async diagnosticTestNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const tests = await this.prisma.diagnosticTest.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(tests.map((t) => [t.id, t.name]));
  }

  private async findingCategoryNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const cats = await this.prisma.findingCategory.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(cats.map((c) => [c.id, c.name]));
  }

  /** Every lab row for a `listLab`/`orderLab` call shares one patientId — resolve their primary case once. */
  private async primaryCaseNo(branchId: string, patientId: string): Promise<string | null> {
    const c = await this.prisma.patientCase.findFirst({
      where: { branchId, patientId },
      orderBy: { createdAt: 'asc' },
      select: { caseNo: true },
    });
    return c?.caseNo ?? null;
  }

  private scope(q: EncounterScope) {
    return {
      patientId: q.patientId,
      deletedAt: null,
      ...(q.encounterType ? { encounterType: q.encounterType } : {}),
      ...(q.encounterId ? { encounterId: q.encounterId } : {}),
    };
  }

  // ── Lab Investigation ──────────────────────────────────────
  async listLab(branchId: string, q: EncounterScope): Promise<LabInvestigationDto[]> {
    const rows = await this.prisma.labInvestigation.findMany({
      where: { branchId, ...this.scope(q) },
      orderBy: { createdAt: 'desc' },
    });
    const [names, caseNo] = await Promise.all([
      this.names([...rows.map((r) => r.approvedById), ...rows.map((r) => r.createdById)]),
      this.primaryCaseNo(branchId, q.patientId),
    ]);
    return rows.map((r) => toLabDto(r, names, caseNo));
  }

  async orderLab(user: RequestUser, branchId: string, input: OrderLabInput): Promise<LabInvestigationDto> {
    const row = await this.prisma.labInvestigation.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        modality: input.modality,
        testId: input.testId ?? null,
        testName: input.testName,
        unit: input.unit || null,
        referenceRange: input.referenceRange || null,
        sampleDate: input.sampleDate ?? null,
        expectedDate: input.expectedDate ?? null,
        center: input.center || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'order', entity: 'lab', entityId: row.id });
    const [names, caseNo] = await Promise.all([
      this.names([row.createdById]),
      this.primaryCaseNo(branchId, input.patientId),
    ]);
    return toLabDto(row, names, caseNo);
  }

  async reportLab(user: RequestUser, branchId: string, id: string, input: ReportLabInput): Promise<LabInvestigationDto> {
    const existing = await this.prisma.labInvestigation.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lab investigation not found');
    const nextValue = input.reportValue !== undefined ? input.reportValue || null : existing.reportValue;
    const hasValue = (nextValue ?? '').trim().length > 0;
    const status: LabStatus = input.approve ? 'approved' : hasValue ? 'reported' : 'pending';
    const row = await this.prisma.labInvestigation.update({
      where: { id },
      data: {
        reportValue: nextValue,
        previousValue: input.previousValue !== undefined ? input.previousValue || null : existing.previousValue,
        status,
        approvedById: input.approve ? user.id : existing.approvedById,
        approvedAt: input.approve ? new Date() : existing.approvedAt,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: input.approve ? 'approve' : 'report', entity: 'lab', entityId: id });
    const [names, caseNo] = await Promise.all([
      this.names([row.approvedById, row.createdById]),
      this.primaryCaseNo(branchId, row.patientId),
    ]);
    return toLabDto(row, names, caseNo);
  }

  // ── Prescription ───────────────────────────────────────────
  async listPrescriptions(branchId: string, q: EncounterScope): Promise<PrescriptionDto[]> {
    const rows = await this.prisma.prescription.findMany({
      where: { branchId, ...this.scope(q) },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    const [names, testNames, categoryNames] = await Promise.all([
      this.names(rows.map((r) => r.prescribedById)),
      this.diagnosticTestNames(rows.flatMap((r) => [...r.pathologyTestIds, ...r.radiologyTestIds])),
      this.findingCategoryNames(rows.map((r) => r.findingCategoryId)),
    ]);
    return rows.map((r) => toPrescriptionDto(r, names, testNames, categoryNames));
  }

  async createPrescription(user: RequestUser, branchId: string, input: CreatePrescriptionInput): Promise<PrescriptionDto> {
    const row = await this.prisma.prescription.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        prescribedById: user.id,
        symptoms: input.symptoms || null,
        findings: input.findings || null,
        note: input.note || null,
        headerNote: input.headerNote || null,
        footerNote: input.footerNote || null,
        findingCategoryId: input.findingCategoryId ?? null,
        findingList: input.findingList,
        findingDescription: input.findingDescription || null,
        findingPrint: input.findingPrint,
        attachmentUrl: input.attachmentUrl || null,
        pathologyTestIds: input.pathologyTestIds,
        radiologyTestIds: input.radiologyTestIds,
        notifyRoles: input.notifyRoles,
        createdById: user.id,
        items: {
          create: input.items.map((it) => ({
            medicineId: it.medicineId ?? null,
            medicineName: it.medicineName,
            dosage: it.dosage || null,
            interval: it.interval || null,
            duration: it.duration || null,
            instruction: it.instruction || null,
          })),
        },
      },
      include: { items: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'prescription', entityId: row.id });
    const [names, testNames, categoryNames] = await Promise.all([
      this.names([row.prescribedById]),
      this.diagnosticTestNames([...row.pathologyTestIds, ...row.radiologyTestIds]),
      this.findingCategoryNames([row.findingCategoryId]),
    ]);
    return toPrescriptionDto(row, names, testNames, categoryNames);
  }

  // ── Medication dose ────────────────────────────────────────
  async listMedication(branchId: string, q: EncounterScope): Promise<MedicationDoseDto[]> {
    const rows = await this.prisma.medicationDose.findMany({
      where: { branchId, ...this.scope(q) },
      orderBy: { dateTime: 'desc' },
    });
    const names = await this.names(rows.map((r) => r.createdById));
    return rows.map((r) => toMedicationDto(r, names));
  }

  async addMedication(user: RequestUser, branchId: string, input: AddMedicationInput): Promise<MedicationDoseDto> {
    const row = await this.prisma.medicationDose.create({
      data: {
        branchId,
        patientId: input.patientId,
        encounterType: input.encounterType ?? null,
        encounterId: input.encounterId ?? null,
        medicineId: input.medicineId ?? null,
        medicineName: input.medicineName,
        dosage: input.dosage || null,
        dateTime: input.dateTime ?? new Date(),
        remarks: input.remarks || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'add', entity: 'medication', entityId: row.id });
    const names = await this.names([row.createdById]);
    return toMedicationDto(row, names);
  }
}

function toLabDto(r: Prisma.LabInvestigationGetPayload<object>, names: Map<string, string>, caseNo: string | null): LabInvestigationDto {
  return {
    id: r.id,
    caseNo,
    modality: r.modality,
    testName: r.testName,
    unit: r.unit,
    referenceRange: r.referenceRange,
    reportValue: r.reportValue,
    previousValue: r.previousValue,
    sampleDate: r.sampleDate ? r.sampleDate.toISOString() : null,
    expectedDate: r.expectedDate ? r.expectedDate.toISOString() : null,
    center: r.center,
    collectedByName: r.createdById ? names.get(r.createdById) ?? null : null,
    status: r.status as LabStatus,
    approvedByName: r.approvedById ? names.get(r.approvedById) ?? null : null,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

type PrescriptionRow = Prisma.PrescriptionGetPayload<{ include: { items: true } }>;
function toPrescriptionDto(
  r: PrescriptionRow,
  names: Map<string, string>,
  testNames: Map<string, string>,
  categoryNames: Map<string, string>,
): PrescriptionDto {
  return {
    id: r.id,
    prescribedByName: r.prescribedById ? names.get(r.prescribedById) ?? null : null,
    symptoms: r.symptoms,
    findings: r.findings,
    note: r.note,
    headerNote: r.headerNote,
    footerNote: r.footerNote,
    findingCategoryId: r.findingCategoryId,
    findingCategoryName: r.findingCategoryId ? categoryNames.get(r.findingCategoryId) ?? null : null,
    findingList: r.findingList,
    findingDescription: r.findingDescription,
    findingPrint: r.findingPrint,
    attachmentUrl: r.attachmentUrl,
    pathologyTestIds: r.pathologyTestIds,
    pathologyTestNames: r.pathologyTestIds.map((id) => testNames.get(id)).filter((n): n is string => !!n),
    radiologyTestIds: r.radiologyTestIds,
    radiologyTestNames: r.radiologyTestIds.map((id) => testNames.get(id)).filter((n): n is string => !!n),
    notifyRoles: r.notifyRoles,
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((it) => ({
      id: it.id,
      medicineName: it.medicineName,
      dosage: it.dosage,
      interval: it.interval,
      duration: it.duration,
      instruction: it.instruction,
    })),
  };
}

function toMedicationDto(r: Prisma.MedicationDoseGetPayload<object>, names: Map<string, string>): MedicationDoseDto {
  return {
    id: r.id,
    medicineName: r.medicineName,
    dosage: r.dosage,
    dateTime: r.dateTime.toISOString(),
    remarks: r.remarks,
    createdByName: r.createdById ? names.get(r.createdById) ?? null : null,
  };
}
