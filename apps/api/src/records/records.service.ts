import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Gender } from '@prisma/client';
import type {
  BirthRecordDto,
  BirthRecordInput,
  BirthRecordUpdateInput,
  DeathRecordDto,
  DeathRecordInput,
  DeathRecordUpdateInput,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

type BirthRow = NonNullable<Awaited<ReturnType<PrismaService['birthRecord']['findFirst']>>>;
type DeathRow = NonNullable<Awaited<ReturnType<PrismaService['deathRecord']['findFirst']>>>;

/** Age at a given date, formatted "Y Year, M Month, D Day" (matches demo Death Record Details). */
function computeAge(dob: Date, asOf: Date): string {
  let years = asOf.getFullYear() - dob.getFullYear();
  let months = asOf.getMonth() - dob.getMonth();
  let days = asOf.getDate() - dob.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} Year, ${months} Month, ${days} Day`;
}

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  // ── Shared lookups ───────────────────────────────────────────
  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private async caseNos(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const cases = await this.prisma.patientCase.findMany({ where: { id: { in: unique } }, select: { id: true, caseNo: true } });
    return new Map(cases.map((c) => [c.id, c.caseNo]));
  }

  private async patients(ids: (string | null | undefined)[]): Promise<Map<string, { patientNo: string; dob: Date | null }>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.patient.findMany({ where: { id: { in: unique } }, select: { id: true, patientNo: true, dob: true } });
    return new Map(rows.map((p) => [p.id, { patientNo: p.patientNo, dob: p.dob }]));
  }

  // ── Birth ────────────────────────────────────────────────────
  async listBirths(branchId: string, query: ListQuery): Promise<Paginated<BirthRecordDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.BirthRecordWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { childName: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.birthRecord.findMany({ where, skip, take, orderBy }),
      this.prisma.birthRecord.count({ where }),
    ]);
    const [names, caseNos, patients] = await Promise.all([
      this.names(rows.map((r) => r.createdById)),
      this.caseNos(rows.map((r) => r.caseId)),
      this.patients(rows.map((r) => r.patientId)),
    ]);
    return paginate(rows.map((r) => this.toBirthDto(r, names, caseNos, patients)), total, query);
  }

  async getBirth(branchId: string, id: string): Promise<BirthRecordDto> {
    const row = await this.prisma.birthRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!row) throw new NotFoundException('Birth record not found');
    const [names, caseNos, patients] = await Promise.all([
      this.names([row.createdById]),
      this.caseNos([row.caseId]),
      this.patients([row.patientId]),
    ]);
    return this.toBirthDto(row, names, caseNos, patients);
  }

  private toBirthDto(
    r: BirthRow,
    names: Map<string, string>,
    caseNos: Map<string, string>,
    patients: Map<string, { patientNo: string; dob: Date | null }>,
  ): BirthRecordDto {
    return {
      id: r.id,
      referenceNo: r.referenceNo,
      caseNo: r.caseId ? caseNos.get(r.caseId) ?? null : null,
      patientId: r.patientId,
      patientNo: r.patientId ? patients.get(r.patientId)?.patientNo ?? null : null,
      childName: r.childName,
      gender: r.gender,
      birthDate: r.birthDate.toISOString(),
      motherName: r.motherName,
      fatherName: r.fatherName,
      weight: r.weight,
      phone: r.phone,
      address: r.address,
      report: r.report,
      bloodGroup: r.bloodGroup,
      childPhotoUrl: r.childPhotoUrl,
      motherPhotoUrl: r.motherPhotoUrl,
      fatherPhotoUrl: r.fatherPhotoUrl,
      documentUrl: r.documentUrl,
      createdByName: r.createdById ? names.get(r.createdById) ?? null : null,
    };
  }

  async createBirth(user: RequestUser, branchId: string, input: BirthRecordInput): Promise<BirthRecordDto> {
    const mother = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!mother) throw new NotFoundException('Mother (patient) not found');
    const caseId = mother.cases[0]?.id ?? null;
    const referenceNo = await this.sequence.next(branchId, 'birth');

    const r = await this.prisma.birthRecord.create({
      data: {
        branchId,
        referenceNo,
        caseId,
        patientId: mother.id,
        childName: input.childName,
        gender: input.gender,
        birthDate: input.birthDate,
        motherName: mother.name,
        fatherName: input.fatherName || null,
        weight: input.weight,
        phone: input.phone || null,
        address: input.address || mother.address || null,
        report: input.report || null,
        bloodGroup: input.bloodGroup,
        childPhotoUrl: input.childPhotoUrl || null,
        motherPhotoUrl: input.motherPhotoUrl || null,
        fatherPhotoUrl: input.fatherPhotoUrl || null,
        documentUrl: input.documentUrl || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'birth_record', entityId: r.id });
    return this.getBirth(branchId, r.id);
  }

  async updateBirth(user: RequestUser, branchId: string, id: string, input: BirthRecordUpdateInput): Promise<BirthRecordDto> {
    const existing = await this.prisma.birthRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Birth record not found');
    let mother: { id: string; name: string; address: string | null; cases: { id: string }[] } | null = null;
    if (input.patientId) {
      mother = await this.prisma.patient.findFirst({
        where: { id: input.patientId, branchId, deletedAt: null },
        include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      if (!mother) throw new NotFoundException('Mother (patient) not found');
    }
    const r = await this.prisma.birthRecord.update({
      where: { id },
      data: {
        ...(mother ? { patientId: mother.id, caseId: mother.cases[0]?.id ?? null, motherName: mother.name } : {}),
        ...(input.childName !== undefined ? { childName: input.childName } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
        ...(input.fatherName !== undefined ? { fatherName: input.fatherName || null } : {}),
        ...(input.weight !== undefined ? { weight: input.weight } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.report !== undefined ? { report: input.report || null } : {}),
        ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
        ...(input.childPhotoUrl !== undefined ? { childPhotoUrl: input.childPhotoUrl || null } : {}),
        ...(input.motherPhotoUrl !== undefined ? { motherPhotoUrl: input.motherPhotoUrl || null } : {}),
        ...(input.fatherPhotoUrl !== undefined ? { fatherPhotoUrl: input.fatherPhotoUrl || null } : {}),
        ...(input.documentUrl !== undefined ? { documentUrl: input.documentUrl || null } : {}),
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'birth_record', entityId: id });
    return this.getBirth(branchId, r.id);
  }

  async removeBirth(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.birthRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Birth record not found');
    await this.prisma.birthRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'birth_record', entityId: id });
  }

  // ── Death ────────────────────────────────────────────────────
  async listDeaths(branchId: string, query: ListQuery): Promise<Paginated<DeathRecordDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.DeathRecordWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { patientName: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.deathRecord.findMany({ where, skip, take, orderBy }),
      this.prisma.deathRecord.count({ where }),
    ]);
    const [names, caseNos, patients] = await Promise.all([
      this.names(rows.map((r) => r.createdById)),
      this.caseNos(rows.map((r) => r.caseId)),
      this.patients(rows.map((r) => r.patientId)),
    ]);
    return paginate(rows.map((r) => this.toDeathDto(r, names, caseNos, patients)), total, query);
  }

  async getDeath(branchId: string, id: string): Promise<DeathRecordDto> {
    const row = await this.prisma.deathRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!row) throw new NotFoundException('Death record not found');
    const [names, caseNos, patients] = await Promise.all([
      this.names([row.createdById]),
      this.caseNos([row.caseId]),
      this.patients([row.patientId]),
    ]);
    return this.toDeathDto(row, names, caseNos, patients);
  }

  private toDeathDto(
    r: DeathRow,
    names: Map<string, string>,
    caseNos: Map<string, string>,
    patients: Map<string, { patientNo: string; dob: Date | null }>,
  ): DeathRecordDto {
    const patient = r.patientId ? patients.get(r.patientId) : undefined;
    return {
      id: r.id,
      referenceNo: r.referenceNo,
      caseNo: r.caseId ? caseNos.get(r.caseId) ?? null : null,
      patientId: r.patientId,
      patientNo: patient?.patientNo ?? null,
      patientName: r.patientName,
      guardianName: r.guardianName,
      gender: r.gender,
      deathDate: r.deathDate.toISOString(),
      age: patient?.dob ? computeAge(patient.dob, r.deathDate) : null,
      address: r.address,
      cause: r.cause,
      bloodGroup: r.bloodGroup,
      attachmentUrl: r.attachmentUrl,
      createdByName: r.createdById ? names.get(r.createdById) ?? null : null,
    };
  }

  async createDeath(user: RequestUser, branchId: string, input: DeathRecordInput): Promise<DeathRecordDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const caseId = patient.cases[0]?.id ?? null;
    const referenceNo = await this.sequence.next(branchId, 'death');

    const r = await this.prisma.deathRecord.create({
      data: {
        branchId,
        referenceNo,
        caseId,
        patientId: patient.id,
        patientName: patient.name,
        guardianName: input.guardianName,
        gender: patient.gender,
        deathDate: input.deathDate,
        cause: input.cause || null,
        address: patient.address || null,
        bloodGroup: input.bloodGroup,
        attachmentUrl: input.attachmentUrl || null,
        createdById: user.id,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'death_record', entityId: r.id });
    return this.getDeath(branchId, r.id);
  }

  async updateDeath(user: RequestUser, branchId: string, id: string, input: DeathRecordUpdateInput): Promise<DeathRecordDto> {
    const existing = await this.prisma.deathRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Death record not found');
    let patient: { id: string; name: string; gender: Gender | null; address: string | null; cases: { id: string }[] } | null = null;
    if (input.patientId) {
      patient = await this.prisma.patient.findFirst({
        where: { id: input.patientId, branchId, deletedAt: null },
        include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      if (!patient) throw new NotFoundException('Patient not found');
    }
    const r = await this.prisma.deathRecord.update({
      where: { id },
      data: {
        ...(patient
          ? { patientId: patient.id, caseId: patient.cases[0]?.id ?? null, patientName: patient.name, gender: patient.gender, address: patient.address || null }
          : {}),
        ...(input.guardianName !== undefined ? { guardianName: input.guardianName } : {}),
        ...(input.deathDate !== undefined ? { deathDate: input.deathDate } : {}),
        ...(input.cause !== undefined ? { cause: input.cause || null } : {}),
        ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
        ...(input.attachmentUrl !== undefined ? { attachmentUrl: input.attachmentUrl || null } : {}),
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'death_record', entityId: id });
    return this.getDeath(branchId, r.id);
  }

  async removeDeath(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.deathRecord.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Death record not found');
    await this.prisma.deathRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'death_record', entityId: id });
  }
}
