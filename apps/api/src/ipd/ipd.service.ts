import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BedHistoryRow,
  DischargeInput,
  IpdAdmissionDetailDto,
  IpdAdmissionDto,
  IpdAdmissionInput,
  IpdAdmissionUpdateInput,
  IpdTab,
  IpdTreatmentHistoryRow,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SequenceService } from '../common/sequence/sequence.service';
import { InvoiceService } from '../billing/invoice.service';
import { paginate, toPrismaPage } from '../common/pagination';
import { resolveCaseId } from '../common/case';
import type { RequestUser } from '../common/types/request-user';

const include = {
  patient: { select: { name: true, gender: true, phone: true } },
  case: { select: { caseNo: true } },
  consultant: { select: { name: true } },
  bed: { select: { bedNo: true, bedGroup: { select: { name: true } } } },
} satisfies Prisma.IpdAdmissionInclude;

type Row = Prisma.IpdAdmissionGetPayload<{ include: typeof include }>;

const detailInclude = {
  patient: { include: { tpa: { select: { name: true } } } },
  case: { select: { caseNo: true } },
  consultant: { select: { name: true } },
  bed: { select: { bedNo: true, bedGroup: { select: { name: true } } } },
} satisfies Prisma.IpdAdmissionInclude;

type DetailRow = Prisma.IpdAdmissionGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class IpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly invoices: InvoiceService,
  ) {}

  async list(branchId: string, tab: IpdTab, query: ListQuery): Promise<Paginated<IpdAdmissionDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.IpdAdmissionWhereInput = {
      branchId,
      deletedAt: null,
      status: tab,
      ...(query.search
        ? {
            OR: [
              { patient: { name: { contains: query.search, mode: 'insensitive' } } },
              { ipdNo: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ipdAdmission.findMany({ where, skip, take, orderBy, include }),
      this.prisma.ipdAdmission.count({ where }),
    ]);
    // Aggregate IPD invoice totals per case for the balance columns.
    const names = await this.names(rows.map((r) => r.createdById));
    const dtos = await Promise.all(rows.map((r) => this.toDto(branchId, r, names)));
    return paginate(dtos, total, query);
  }

  /** All admissions for a patient (IPD detail-page "Treatment History" tab). */
  async listByPatient(branchId: string, patientId: string): Promise<IpdTreatmentHistoryRow[]> {
    const rows = await this.prisma.ipdAdmission.findMany({
      where: { branchId, patientId, deletedAt: null },
      orderBy: { admissionDate: 'desc' },
      include,
    });
    return rows.map((r) => ({
      id: r.id,
      ipdNo: r.ipdNo,
      symptoms: r.symptoms,
      consultantName: r.consultant.name,
      bedLabel: `${r.bed.bedGroup.name} · ${r.bed.bedNo}`,
      admissionDate: r.admissionDate.toISOString(),
    }));
  }

  /** Resolve staff names for the *ById columns (IpdAdmission keeps a plain FK id, no relation). */
  private async names(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  /**
   * `opts.caseId` is for internal callers only — Move-to-IPD passes the OPD
   * visit's case so the episode stays one case (blueprint rule #13). It is
   * deliberately not on the request schema: clients name a case by its number
   * via `input.caseNo`, so they cannot file an admission under another
   * patient's case by guessing a UUID.
   */
  async create(
    user: RequestUser,
    branchId: string,
    input: IpdAdmissionInput,
    opts: { caseId?: string } = {},
  ): Promise<IpdAdmissionDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    // Rule #7: the patient list hides the New-encounter menu for the deceased,
    // but the rule has to hold here too — the form can be reached by URL, and
    // the patient picker does not know the flag.
    if (patient.isDeceased) throw new BadRequestException('Patient is recorded as deceased');

    const admission = await this.prisma.$transaction(async (tx) => {
      const caseId = await resolveCaseId(tx, this.sequence, branchId, input.patientId, {
        caseNo: input.caseNo,
        caseId: opts.caseId,
      });

      // Allocate the bed atomically — reject if already taken.
      const bed = await tx.bed.findFirst({ where: { id: input.bedId, branchId, deletedAt: null } });
      if (!bed) throw new NotFoundException('Bed not found');
      if (bed.status === 'allotted') throw new BadRequestException('Bed is already allotted');
      await tx.bed.update({ where: { id: bed.id }, data: { status: 'allotted' } });

      // Deliberately no invoice here (blueprint rule #5). Admission allocates
      // a bed; the money starts on the Charges tab once treatment does.

      const ipdNo = await this.sequence.next(branchId, 'ipd', tx);
      const created = await tx.ipdAdmission.create({
        data: {
          branchId,
          ipdNo,
          patientId: input.patientId,
          caseId,
          consultantId: input.consultantId,
          admissionDate: input.admissionDate,
          bedId: input.bedId,
          creditLimit: input.creditLimit,
          isAntenatal: input.isAntenatal,
          casualty: input.casualty,
          oldPatient: input.oldPatient,
          applyTpa: input.applyTpa,
          liveConsult: input.liveConsult,
          reference: input.reference || null,
          symptomType: input.symptomType || null,
          symptoms: input.symptoms || null,
          symptomDescription: input.symptomDescription || null,
          icd10Group: input.icd10Group || null,
          icd10Diagnosis: input.icd10Diagnosis || null,
          knownAllergies: input.knownAllergies || null,
          previousMedicalIssue: input.previousMedicalIssue || null,
          note: input.note || null,
          customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
          createdById: user.id,
        },
        include,
      });

      // Open the first bed occupancy (rule #8). The log starts at admission,
      // not at the first transfer — otherwise an untransferred patient has no
      // record of where they were.
      await tx.bedHistory.create({
        data: {
          branchId,
          ipdAdmissionId: created.id,
          bedId: bed.id,
          bedLabel: `${created.bed.bedGroup.name} · ${created.bed.bedNo}`,
          fromDate: input.admissionDate,
          active: true,
          createdById: user.id,
        },
      });

      return created;
    });

    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'ipd', entityId: admission.id });
    return this.toDto(branchId, admission, new Map([[user.id, user.name]]));
  }

  async detail(branchId: string, id: string): Promise<IpdAdmissionDetailDto> {
    const a = await this.prisma.ipdAdmission.findFirst({ where: { id, branchId, deletedAt: null }, include: detailInclude });
    if (!a) throw new NotFoundException('Admission not found');
    return this.toDetailDto(branchId, a);
  }

  async update(user: RequestUser, branchId: string, id: string, input: IpdAdmissionUpdateInput): Promise<IpdAdmissionDetailDto> {
    const existing = await this.prisma.ipdAdmission.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Admission not found');

    const a = await this.prisma.ipdAdmission.update({
      where: { id },
      data: {
        consultantId: input.consultantId,
        admissionDate: input.admissionDate,
        creditLimit: input.creditLimit,
        isAntenatal: input.isAntenatal,
        casualty: input.casualty,
        oldPatient: input.oldPatient,
        applyTpa: input.applyTpa,
        liveConsult: input.liveConsult,
        reference: input.reference || null,
        symptomType: input.symptomType || null,
        symptoms: input.symptoms || null,
        symptomDescription: input.symptomDescription || null,
        icd10Group: input.icd10Group || null,
        icd10Diagnosis: input.icd10Diagnosis || null,
        knownAllergies: input.knownAllergies || null,
        previousMedicalIssue: input.previousMedicalIssue || null,
        note: input.note || null,
      },
      include: detailInclude,
    });

    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'ipd', entityId: id });
    return this.toDetailDto(branchId, a);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.ipdAdmission.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Admission not found');
    if (existing.status === 'admitted') {
      await this.prisma.bed.update({ where: { id: existing.bedId }, data: { status: 'available' } });
    }
    await this.prisma.ipdAdmission.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'ipd', entityId: id });
  }

  /** Discharge: free the bed and mark the admission discharged (one transaction). */
  async discharge(
    user: RequestUser,
    branchId: string,
    id: string,
    input: DischargeInput,
  ): Promise<IpdAdmissionDto> {
    const admission = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ipdAdmission.findFirst({ where: { id, branchId, deletedAt: null } });
      if (!existing) throw new NotFoundException('Admission not found');
      if (existing.status === 'discharged') throw new BadRequestException('Already discharged');
      // Backdating is expected; backdating past the admission is not. It would
      // write a bed occupancy that ends before it starts.
      if (input.dischargeDate < existing.admissionDate) {
        throw new BadRequestException('Discharge date cannot be before the admission date');
      }
      await tx.bed.update({ where: { id: existing.bedId }, data: { status: 'available' } });

      // Close the open occupancy at the discharge date (rule #8). Without this
      // the log keeps claiming the patient is still in the bed.
      await tx.bedHistory.updateMany({
        where: { branchId, ipdAdmissionId: id, active: true },
        data: { toDate: input.dischargeDate, active: false },
      });

      // Blueprint §8.5 step 5 / rule #7: a death discharge marks the patient
      // deceased. That flag is what stops the Patient list offering to start a
      // new OPD/IPD/lab record for them, so it has to happen here — nobody is
      // going to remember to go and tick it by hand afterwards.
      if (input.dischargeStatus === 'death') {
        await tx.patient.update({
          where: { id: existing.patientId },
          data: { isDeceased: true },
        });
      }

      return tx.ipdAdmission.update({
        where: { id },
        data: {
          status: 'discharged',
          dischargeDate: input.dischargeDate,
          dischargeStatus: input.dischargeStatus,
          dischargeNote: input.note || null,
          dischargeOperation: input.operation || null,
          dischargeDiagnosis: input.diagnosis || null,
          dischargeInvestigation: input.investigation || null,
          treatmentHome: input.treatmentHome || null,
        },
        include,
      });
    });
    await this.audit.record({
      branchId,
      userId: user.id,
      action: 'discharge',
      entity: 'ipd',
      entityId: id,
      after: { dischargeStatus: input.dischargeStatus },
    });
    const names = await this.names([admission.createdById]);
    return this.toDto(branchId, admission, names);
  }

  /**
   * Bed occupancy log for an admission. Every row is a real record now —
   * admission opens one, each transfer closes and opens one, discharge closes
   * the last. It used to synthesise a row from the admission's *current* bed
   * when no transfer existed, which quietly reported the wrong bed for the
   * early part of any stay that later moved.
   */
  async bedHistory(branchId: string, admissionId: string): Promise<BedHistoryRow[]> {
    const rows = await this.prisma.bedHistory.findMany({
      where: { branchId, ipdAdmissionId: admissionId },
      orderBy: { fromDate: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      bedLabel: r.bedLabel,
      fromDate: r.fromDate.toISOString(),
      toDate: r.toDate ? r.toDate.toISOString() : null,
      active: r.active,
    }));
  }

  /** Transfer a bed: close the current occupancy, open the new one, flip bed statuses. */
  async transferBed(user: RequestUser, branchId: string, admissionId: string, bedId: string): Promise<BedHistoryRow[]> {
    await this.prisma.$transaction(async (tx) => {
      const a = await tx.ipdAdmission.findFirst({ where: { id: admissionId, branchId, deletedAt: null }, include });
      if (!a) throw new NotFoundException('Admission not found');
      if (a.status === 'discharged') throw new BadRequestException('Patient already discharged');
      if (a.bedId === bedId) throw new BadRequestException('Patient is already in that bed');

      const newBed = await tx.bed.findFirst({ where: { id: bedId, branchId, deletedAt: null }, include: { bedGroup: { select: { name: true } } } });
      if (!newBed) throw new NotFoundException('Bed not found');
      if (newBed.status === 'allotted') throw new BadRequestException('Bed is already allotted');

      const now = new Date();
      // Admission always opens an occupancy, so there is normally one to close.
      // The fallback covers a row that somehow lost its open occupancy — better
      // to record the stretch we can infer than to leave a gap in the log.
      const open = await tx.bedHistory.findFirst({ where: { branchId, ipdAdmissionId: admissionId, active: true } });
      if (open) {
        await tx.bedHistory.update({ where: { id: open.id }, data: { toDate: now, active: false } });
      } else {
        await tx.bedHistory.create({
          data: { branchId, ipdAdmissionId: admissionId, bedId: a.bedId, bedLabel: `${a.bed.bedGroup.name} · ${a.bed.bedNo}`, fromDate: a.admissionDate, toDate: now, active: false, createdById: user.id },
        });
      }
      await tx.bedHistory.create({
        data: { branchId, ipdAdmissionId: admissionId, bedId, bedLabel: `${newBed.bedGroup.name} · ${newBed.bedNo}`, fromDate: now, active: true, createdById: user.id },
      });
      await tx.bed.update({ where: { id: a.bedId }, data: { status: 'available' } });
      await tx.bed.update({ where: { id: bedId }, data: { status: 'allotted' } });
      await tx.ipdAdmission.update({ where: { id: admissionId }, data: { bedId } });
    });
    await this.audit.record({ branchId, userId: user.id, action: 'bed_transfer', entity: 'ipd', entityId: admissionId, after: { bedId } });
    return this.bedHistory(branchId, admissionId);
  }

  private async toDto(branchId: string, a: Row, names: Map<string, string>): Promise<IpdAdmissionDto> {
    // Sum IPD invoices tied to this admission's case.
    const agg = a.caseId
      ? await this.prisma.invoice.aggregate({
          where: { branchId, module: 'ipd', caseId: a.caseId, deletedAt: null },
          _sum: { netAmount: true, paid: true, balance: true, tax: true },
        })
      : { _sum: { netAmount: null, paid: null, balance: null, tax: null } };
    return {
      id: a.id,
      ipdNo: a.ipdNo,
      caseNo: a.case?.caseNo ?? null,
      patientId: a.patientId,
      patientName: a.patient.name,
      patientGender: a.patient.gender,
      patientPhone: a.patient.phone,
      consultantId: a.consultantId,
      consultantName: a.consultant.name,
      admissionDate: a.admissionDate.toISOString(),
      bedId: a.bedId,
      bedLabel: `${a.bed.bedGroup.name} · ${a.bed.bedNo}`,
      creditLimit: Number(a.creditLimit),
      isAntenatal: a.isAntenatal,
      liveConsult: a.liveConsult,
      symptoms: a.symptoms,
      previousMedicalIssue: a.previousMedicalIssue,
      createdByName: a.createdById ? names.get(a.createdById) ?? null : null,
      dischargeDate: a.dischargeDate ? a.dischargeDate.toISOString() : null,
      status: a.status,
      billedAmount: Number(agg._sum.netAmount ?? 0),
      paidAmount: Number(agg._sum.paid ?? 0),
      taxAmount: Number(agg._sum.tax ?? 0),
      balance: Number(agg._sum.balance ?? 0),
    };
  }

  private async toDetailDto(branchId: string, a: DetailRow): Promise<IpdAdmissionDetailDto> {
    const agg = a.caseId
      ? await this.prisma.invoice.aggregate({
          where: { branchId, module: 'ipd', caseId: a.caseId, deletedAt: null },
          _sum: { netAmount: true, paid: true, balance: true, tax: true },
        })
      : { _sum: { netAmount: null, paid: null, balance: null, tax: null } };
    return {
      id: a.id,
      ipdNo: a.ipdNo,
      caseNo: a.case?.caseNo ?? null,
      patientId: a.patientId,
      patientName: a.patient.name,
      oldPatient: a.oldPatient,
      guardianName: a.patient.guardianName,
      gender: a.patient.gender,
      maritalStatus: a.patient.maritalStatus,
      phone: a.patient.phone,
      email: a.patient.email,
      address: a.patient.address,
      age: a.patient.age,
      bloodGroup: a.patient.bloodGroup,
      knownAllergies: a.knownAllergies ?? a.patient.allergies,
      admissionDate: a.admissionDate.toISOString(),
      dischargeDate: a.dischargeDate ? a.dischargeDate.toISOString() : null,
      status: a.status,
      dischargeStatus: a.dischargeStatus,
      dischargeNote: a.dischargeNote,
      dischargeOperation: a.dischargeOperation,
      dischargeDiagnosis: a.dischargeDiagnosis,
      dischargeInvestigation: a.dischargeInvestigation,
      treatmentHome: a.treatmentHome,
      casualty: a.casualty,
      reference: a.reference,
      tpaName: a.patient.tpa?.name ?? null,
      tpaIdNo: a.patient.tpaIdNo,
      consultantId: a.consultantId,
      consultantName: a.consultant.name,
      bedId: a.bedId,
      bedLabel: `${a.bed.bedGroup.name} · ${a.bed.bedNo}`,
      creditLimit: Number(a.creditLimit),
      isAntenatal: a.isAntenatal,
      applyTpa: a.applyTpa,
      liveConsult: a.liveConsult,
      note: a.note,
      symptomType: a.symptomType,
      symptoms: a.symptoms,
      symptomDescription: a.symptomDescription,
      icd10Group: a.icd10Group,
      icd10Diagnosis: a.icd10Diagnosis,
      previousMedicalIssue: a.previousMedicalIssue ?? a.patient.prevMedicalIssue,
      billedAmount: Number(agg._sum.netAmount ?? 0),
      paidAmount: Number(agg._sum.paid ?? 0),
      taxAmount: Number(agg._sum.tax ?? 0),
      balance: Number(agg._sum.balance ?? 0),
    };
  }
}
