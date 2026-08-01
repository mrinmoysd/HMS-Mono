import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  canonicalizePhone,
  PHONE_LOOKUP_MIN_DIGITS,
  type Paginated,
  type PatientDto,
  type PatientImportInput,
  type PatientImportResult,
  type PatientInput,
  type PatientListQuery,
  type UpdatePatientInput,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async list(branchId: string, query: PatientListQuery): Promise<Paginated<PatientDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    // Match phone on the digits-only key too, so a plain-digits search finds
    // patients regardless of how their number was formatted on entry.
    const searchDigits = query.search ? canonicalizePhone(query.search) : null;
    const where: Prisma.PatientWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.disabled ? { isDisabled: query.disabled === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { patientNo: { contains: query.search, mode: 'insensitive' } },
              ...(searchDigits ? [{ phoneNormalized: { contains: searchDigits } }] : []),
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take, orderBy }),
      this.prisma.patient.count({ where }),
    ]);
    return paginate(rows.map(toDto), total, query);
  }

  async get(branchId: string, id: string): Promise<PatientDto> {
    const p = await this.prisma.patient.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!p) throw new NotFoundException('Patient not found');
    return toDto(p);
  }

  /** Every patient already registered under a phone number (shared-number checkpoint). */
  async findByPhone(branchId: string, phone: string): Promise<PatientDto[]> {
    const normalized = canonicalizePhone(phone);
    if (!normalized || normalized.length < PHONE_LOOKUP_MIN_DIGITS) return [];
    const rows = await this.prisma.patient.findMany({
      where: { branchId, deletedAt: null, phoneNormalized: normalized },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(user: RequestUser, branchId: string, input: PatientInput): Promise<PatientDto> {
    const patient = await this.prisma.$transaction(async (tx) => {
      const patientNo = await this.sequence.next(branchId, 'patient', tx);
      const created = await tx.patient.create({
        data: {
          ...normalize(input),
          branchId,
          patientNo,
          createdById: user.id,
        } as Prisma.PatientUncheckedCreateInput,
      });
      // No Case is opened here. A case belongs to an encounter, not to a
      // person: it is minted by the first OPD visit or IPD admission and is
      // what every downstream bill joins on. Opening one at registration gave
      // every patient a single case for life, so two visits shared one case
      // and their billing could never be told apart.
      return created;
    });

    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'create',
      entity: 'patient',
      entityId: patient.id,
      after: { patientNo: patient.patientNo, name: patient.name },
    });
    return toDto(patient);
  }

  async update(
    user: RequestUser,
    branchId: string,
    id: string,
    input: UpdatePatientInput,
  ): Promise<PatientDto> {
    await this.get(branchId, id); // ensures existence + branch scope
    const updated = await this.prisma.patient.update({
      where: { id },
      data: normalize(input) as Prisma.PatientUncheckedUpdateInput,
    });
    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'update',
      entity: 'patient',
      entityId: id,
    });
    return toDto(updated);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    await this.get(branchId, id);
    await this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'delete',
      entity: 'patient',
      entityId: id,
    });
  }

  async import(
    user: RequestUser,
    branchId: string,
    input: PatientImportInput,
  ): Promise<PatientImportResult> {
    const failed: PatientImportResult['failed'] = [];
    let inserted = 0;
    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i];
      if (!row) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.create(user, branchId, row as PatientInput);
        inserted++;
      } catch (err) {
        failed.push({ row: i + 1, reason: (err as Error).message });
      }
    }
    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'import',
      entity: 'patient',
      after: { inserted, failed: failed.length },
    });
    return { inserted, failed };
  }

  async bulkRemove(user: RequestUser, branchId: string, ids: string[]): Promise<{ deleted: number }> {
    const result = await this.prisma.patient.updateMany({
      where: { id: { in: ids }, branchId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'bulk_delete',
      entity: 'patient',
      after: { ids, count: result.count },
    });
    return { deleted: result.count };
  }
}

function normalize(input: Partial<PatientInput & UpdatePatientInput>): Record<string, unknown> {
  // Drop empty strings so optional fields stay null.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = v === '' ? null : v;
  }
  // Keep the digits-only match key in sync whenever phone is part of the payload.
  if ('phone' in input) {
    out.phoneNormalized = canonicalizePhone(typeof input.phone === 'string' ? input.phone : null);
  }
  return out;
}

function toDto(p: {
  id: string;
  patientNo: string;
  name: string;
  guardianName: string | null;
  gender: string | null;
  age: string;
  dob: Date | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
  tpaId: string | null;
  tpaIdNo: string | null;
  tpaValidity: Date | null;
  isDisabled: boolean;
  isDeceased: boolean;
  createdAt: Date;
}): PatientDto {
  return {
    id: p.id,
    patientNo: p.patientNo,
    name: p.name,
    guardianName: p.guardianName,
    gender: p.gender,
    age: p.age,
    dob: p.dob ? p.dob.toISOString() : null,
    bloodGroup: p.bloodGroup,
    maritalStatus: p.maritalStatus,
    photoUrl: p.photoUrl,
    phone: p.phone,
    email: p.email,
    address: p.address,
    remarks: p.remarks,
    tpaId: p.tpaId,
    tpaIdNo: p.tpaIdNo,
    tpaValidity: p.tpaValidity ? p.tpaValidity.toISOString() : null,
    isDisabled: p.isDisabled,
    isDeceased: p.isDeceased,
    createdAt: p.createdAt.toISOString(),
  };
}
