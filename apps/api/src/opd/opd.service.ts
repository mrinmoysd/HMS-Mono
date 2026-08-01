import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  IpdAdmissionDto,
  ListQuery,
  MoveToIpdInput,
  OpdTab,
  OpdVisitDetailDto,
  OpdVisitDto,
  OpdVisitInput,
  OpdVisitUpdateInput,
  OpdCheckupDto,
  OpdCheckupInput,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { InvoiceService } from '../billing/invoice.service';
import { IpdService } from '../ipd/ipd.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { resolveCaseId } from '../common/case';
import { startOfToday, endOfToday } from '../common/dates';
import type { RequestUser } from '../common/types/request-user';

const include = {
  patient: { select: { name: true } },
  case: { select: { caseNo: true } },
  consultant: { select: { name: true } },
  invoice: { select: { netAmount: true, paid: true, balance: true } },
} satisfies Prisma.OpdVisitInclude;

type Row = Prisma.OpdVisitGetPayload<{ include: typeof include }>;

const detailInclude = {
  patient: { include: { tpa: { select: { name: true } } } },
  case: { select: { caseNo: true } },
  consultant: { select: { name: true } },
  invoice: { select: { netAmount: true, paid: true, balance: true } },
} satisfies Prisma.OpdVisitInclude;

type DetailRow = Prisma.OpdVisitGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class OpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly invoices: InvoiceService,
    private readonly ipd: IpdService,
  ) {}

  async list(branchId: string, tab: OpdTab, query: ListQuery): Promise<Paginated<OpdVisitDto>> {
    const { skip, take } = toPrismaPage(query);
    const dateFilter: Prisma.OpdVisitWhereInput =
      tab === 'today'
        ? { appointmentDate: { gte: startOfToday(), lte: endOfToday() } }
        : tab === 'upcoming'
          ? { appointmentDate: { gt: endOfToday() } }
          : { appointmentDate: { lt: startOfToday() } };
    const where: Prisma.OpdVisitWhereInput = {
      branchId,
      deletedAt: null,
      ...dateFilter,
      ...(query.search
        ? {
            OR: [
              { patient: { name: { contains: query.search, mode: 'insensitive' } } },
              { opdNo: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.opdVisit.findMany({
        where,
        skip,
        take,
        orderBy: { appointmentDate: tab === 'old' ? 'desc' : 'asc' },
        include,
      }),
      this.prisma.opdVisit.count({ where }),
    ]);
    const names = await this.names(rows.map((r) => r.createdById));
    return paginate(rows.map((r) => toDto(r, names)), total, query);
  }

  /** Resolve staff names for the *ById columns (OpdVisit keeps a plain FK id, no relation). */
  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  async create(user: RequestUser, branchId: string, input: OpdVisitInput): Promise<OpdVisitDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const visit = await this.prisma.$transaction(async (tx) => {
      // The visit mints its own case (or continues the one the user named).
      // Inside the transaction so a failed bill does not leave an orphan case.
      const caseId = await resolveCaseId(tx, this.sequence, branchId, input.patientId, {
        caseNo: input.caseNo,
      });

      // Generate the OPD bill through the shared invoice engine.
      const invoice = await this.invoices.create(
        {
          branchId,
          patientId: input.patientId,
          caseId,
          module: 'opd',
          items: input.items,
          createdById: user.id,
          initialPayment: input.payment && input.payment.amount > 0 ? input.payment : null,
        },
        tx,
      );
      const opdNo = await this.sequence.next(branchId, 'opd', tx);
      return tx.opdVisit.create({
        data: {
          branchId,
          opdNo,
          patientId: input.patientId,
          caseId,
          consultantId: input.consultantId,
          appointmentDate: input.appointmentDate,
          symptomType: input.symptomType || null,
          symptoms: input.symptoms || null,
          symptomDescription: input.symptomDescription || null,
          icd10Group: input.icd10Group || null,
          icd10Diagnosis: input.icd10Diagnosis || null,
          knownAllergies: input.knownAllergies || null,
          previousMedicalIssue: input.previousMedicalIssue || null,
          note: input.note || null,
          isAntenatal: input.isAntenatal,
          casualty: input.casualty,
          oldPatient: input.oldPatient,
          applyTpa: input.applyTpa,
          liveConsult: input.liveConsult,
          reference: input.reference || null,
          invoiceId: invoice.id,
          customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
          createdById: user.id,
        },
        include,
      });
    });

    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'opd', entityId: visit.id });
    return toDto(visit, new Map([[user.id, user.name]]));
  }

  async detail(branchId: string, id: string): Promise<OpdVisitDetailDto> {
    const visit = await this.prisma.opdVisit.findFirst({
      where: { id, branchId, deletedAt: null },
      include: detailInclude,
    });
    if (!visit) throw new NotFoundException('Visit not found');
    return toDetailDto(visit);
  }

  async update(
    user: RequestUser,
    branchId: string,
    id: string,
    input: OpdVisitUpdateInput,
  ): Promise<OpdVisitDetailDto> {
    const existing = await this.prisma.opdVisit.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Visit not found');

    const visit = await this.prisma.opdVisit.update({
      where: { id },
      data: {
        consultantId: input.consultantId,
        appointmentDate: input.appointmentDate,
        symptomType: input.symptomType || null,
        symptoms: input.symptoms || null,
        symptomDescription: input.symptomDescription || null,
        icd10Group: input.icd10Group || null,
        icd10Diagnosis: input.icd10Diagnosis || null,
        knownAllergies: input.knownAllergies || null,
        previousMedicalIssue: input.previousMedicalIssue || null,
        note: input.note || null,
        isAntenatal: input.isAntenatal,
        casualty: input.casualty,
        oldPatient: input.oldPatient,
        applyTpa: input.applyTpa,
        liveConsult: input.liveConsult,
        reference: input.reference || null,
      },
      include: detailInclude,
    });

    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'opd', entityId: id });
    return toDetailDto(visit);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const visit = await this.prisma.opdVisit.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!visit) throw new NotFoundException('Visit not found');
    await this.prisma.opdVisit.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'opd', entityId: id });
  }

  // ── Checkups (CHKID) ─────────────────────────────────────────
  //
  // A visit holds one or more checkups. Everything here is scoped by visit
  // *and* branch so a guessed id from another branch resolves to nothing.

  private async requireVisit(branchId: string, visitId: string) {
    const visit = await this.prisma.opdVisit.findFirst({
      where: { id: visitId, branchId, deletedAt: null },
    });
    if (!visit) throw new NotFoundException('Visit not found');
    return visit;
  }

  async listCheckups(branchId: string, visitId: string): Promise<OpdCheckupDto[]> {
    await this.requireVisit(branchId, visitId);
    const rows = await this.prisma.opdCheckup.findMany({
      where: { visitId, branchId, deletedAt: null },
      orderBy: { appointmentDate: 'asc' },
      include: { consultant: { select: { name: true } } },
    });
    return rows.map(toCheckupDto);
  }

  async createCheckup(
    user: RequestUser,
    branchId: string,
    visitId: string,
    input: OpdCheckupInput,
  ): Promise<OpdCheckupDto> {
    await this.requireVisit(branchId, visitId);
    const row = await this.prisma.$transaction(async (tx) => {
      const checkupNo = await this.sequence.next(branchId, 'opd_checkup', tx);
      return tx.opdCheckup.create({
        data: {
          branchId,
          visitId,
          checkupNo,
          appointmentDate: input.appointmentDate,
          consultantId: input.consultantId,
          reference: input.reference || null,
          symptoms: input.symptoms || null,
          findings: input.findings || null,
          note: input.note || null,
          createdById: user.id,
        },
        include: { consultant: { select: { name: true } } },
      });
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'opd_checkup', entityId: row.id });
    return toCheckupDto(row);
  }

  async updateCheckup(
    user: RequestUser,
    branchId: string,
    id: string,
    input: OpdCheckupInput,
  ): Promise<OpdCheckupDto> {
    const existing = await this.prisma.opdCheckup.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Checkup not found');
    const row = await this.prisma.opdCheckup.update({
      where: { id },
      data: {
        appointmentDate: input.appointmentDate,
        consultantId: input.consultantId,
        reference: input.reference || null,
        symptoms: input.symptoms || null,
        findings: input.findings || null,
        note: input.note || null,
      },
      include: { consultant: { select: { name: true } } },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'opd_checkup', entityId: id });
    return toCheckupDto(row);
  }

  async removeCheckup(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.opdCheckup.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Checkup not found');
    await this.prisma.opdCheckup.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'opd_checkup', entityId: id });
  }

  /** Move Patient to IPD: prefill an admission from this visit, then reuse the IPD admit engine. */
  async moveToIpd(
    user: RequestUser,
    branchId: string,
    id: string,
    input: MoveToIpdInput,
  ): Promise<IpdAdmissionDto> {
    const visit = await this.prisma.opdVisit.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!visit) throw new NotFoundException('Visit not found');

    // Reuse the visit's case — rule #13. An outpatient becoming an inpatient
    // is one episode; minting a second case here would split this patient's
    // billing history in half, and nothing downstream could put it back.
    const admission = await this.ipd.create(user, branchId, {
      patientId: visit.patientId,
      consultantId: input.consultantId,
      admissionDate: input.admissionDate,
      bedId: input.bedId,
      creditLimit: input.creditLimit,
      isAntenatal: input.isAntenatal,
      casualty: input.casualty,
      oldPatient: input.oldPatient,
      applyTpa: false,
      liveConsult: input.liveConsult,
      reference: input.reference || visit.reference || '',
      symptomType: visit.symptomType || '',
      symptoms: visit.symptoms || '',
      symptomDescription: visit.symptomDescription || '',
      icd10Group: visit.icd10Group || '',
      icd10Diagnosis: visit.icd10Diagnosis || '',
      knownAllergies: visit.knownAllergies || '',
      previousMedicalIssue: visit.previousMedicalIssue || '',
      note: visit.note || '',
      items: [],
      customFields: { movedFromOpdId: id },
    }, { caseId: visit.caseId ?? undefined });

    await this.audit.record({ branchId, userId: user.id, action: 'move_to_ipd', entity: 'opd', entityId: id, after: { ipdAdmissionId: admission.id } });
    return admission;
  }
}

function toDto(v: Row, names: Map<string, string>): OpdVisitDto {
  return {
    id: v.id,
    opdNo: v.opdNo,
    caseNo: v.case?.caseNo ?? null,
    patientId: v.patientId,
    patientName: v.patient.name,
    consultantId: v.consultantId,
    consultantName: v.consultant.name,
    appointmentDate: v.appointmentDate.toISOString(),
    symptoms: v.symptoms,
    reference: v.reference,
    previousMedicalIssue: v.previousMedicalIssue,
    isAntenatal: v.isAntenatal,
    createdByName: v.createdById ? names.get(v.createdById) ?? null : null,
    invoiceId: v.invoiceId,
    netAmount: v.invoice ? Number(v.invoice.netAmount) : 0,
    paid: v.invoice ? Number(v.invoice.paid) : 0,
    balance: v.invoice ? Number(v.invoice.balance) : 0,
  };
}

function toDetailDto(v: DetailRow): OpdVisitDetailDto {
  return {
    id: v.id,
    opdNo: v.opdNo,
    caseNo: v.case?.caseNo ?? null,
    patientId: v.patientId,
    patientName: v.patient.name,
    oldPatient: v.oldPatient,
    guardianName: v.patient.guardianName,
    gender: v.patient.gender,
    maritalStatus: v.patient.maritalStatus,
    phone: v.patient.phone,
    email: v.patient.email,
    address: v.patient.address,
    age: v.patient.age,
    bloodGroup: v.patient.bloodGroup,
    knownAllergies: v.knownAllergies ?? v.patient.allergies,
    appointmentDate: v.appointmentDate.toISOString(),
    casualty: v.casualty,
    reference: v.reference,
    tpaName: v.patient.tpa?.name ?? null,
    tpaIdNo: v.patient.tpaIdNo,
    tpaValidity: v.patient.tpaValidity ? v.patient.tpaValidity.toISOString() : null,
    consultantId: v.consultantId,
    consultantName: v.consultant.name,
    isAntenatal: v.isAntenatal,
    applyTpa: v.applyTpa,
    liveConsult: v.liveConsult,
    note: v.note,
    symptomType: v.symptomType,
    symptoms: v.symptoms,
    symptomDescription: v.symptomDescription,
    icd10Group: v.icd10Group,
    icd10Diagnosis: v.icd10Diagnosis,
    previousMedicalIssue: v.previousMedicalIssue ?? v.patient.prevMedicalIssue,
    invoiceId: v.invoiceId,
    netAmount: v.invoice ? Number(v.invoice.netAmount) : 0,
    paid: v.invoice ? Number(v.invoice.paid) : 0,
    balance: v.invoice ? Number(v.invoice.balance) : 0,
  };
}

function toCheckupDto(c: {
  id: string;
  checkupNo: string;
  visitId: string;
  appointmentDate: Date;
  consultantId: string;
  consultant: { name: string };
  reference: string | null;
  symptoms: string | null;
  findings: string | null;
  note: string | null;
}): OpdCheckupDto {
  return {
    id: c.id,
    checkupNo: c.checkupNo,
    visitId: c.visitId,
    appointmentDate: c.appointmentDate.toISOString(),
    consultantId: c.consultantId,
    consultantName: c.consultant.name,
    reference: c.reference,
    symptoms: c.symptoms,
    findings: c.findings,
    note: c.note,
  };
}
