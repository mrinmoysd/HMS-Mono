import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MedicalHistoryPoint,
  PatientProfileDto,
  PatientReportDto,
  PatientReportModuleGroup,
  PatientReportVisit,
  ProfileVisitRow,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalService } from './clinical.service';

const MODULES = ['opd', 'pharmacy', 'pathology', 'radiology', 'blood', 'ambulance'] as const;
const BILL_MODULES = ['pharmacy', 'pathology', 'radiology', 'blood', 'ambulance'] as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinical: ClinicalService,
  ) {}

  async profile(branchId: string, patientId: string): Promise<PatientProfileDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
      include: { tpa: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const [{ vitals, bmi }, findings, symptoms, timeline, opdVisits, ipdAdmissions, invoices] =
      await Promise.all([
        this.clinical.currentVitals(branchId, patientId),
        this.clinical.listFindingRecords(branchId, patientId),
        this.clinical.listSymptomRecords(branchId, patientId),
        this.clinical.listTimeline(branchId, patientId),
        this.prisma.opdVisit.findMany({
          where: { patientId, branchId, deletedAt: null },
          orderBy: { appointmentDate: 'desc' },
          include: { consultant: { select: { name: true } }, case: { select: { caseNo: true } } },
        }),
        this.prisma.ipdAdmission.findMany({
          where: { patientId, branchId, deletedAt: null },
          include: { consultant: { select: { id: true, name: true } } },
        }),
        this.prisma.invoice.findMany({
          where: { patientId, branchId, deletedAt: null },
          select: { module: true, createdAt: true },
        }),
      ]);

    const visits: ProfileVisitRow[] = opdVisits.map((o) => ({
      id: o.id,
      opdNo: o.opdNo,
      caseNo: o.case?.caseNo ?? null,
      appointmentDate: o.appointmentDate.toISOString(),
      consultantName: o.consultant.name,
      symptoms: o.symptoms,
      symptomDescription: o.symptomDescription,
      reference: o.reference,
      previousMedicalIssue: o.previousMedicalIssue ?? patient.prevMedicalIssue,
    }));

    // Distinct consultants across OPD + IPD.
    const consultantMap = new Map<string, string>();
    const opdConsultants = await this.prisma.opdVisit.findMany({
      where: { patientId, branchId, deletedAt: null },
      select: { consultantId: true, consultant: { select: { name: true } } },
      distinct: ['consultantId'],
    });
    for (const c of opdConsultants) consultantMap.set(c.consultantId, c.consultant.name);
    for (const a of ipdAdmissions) consultantMap.set(a.consultant.id, a.consultant.name);

    // Medical history: per-year per-module invoice counts.
    const historyByYear = new Map<number, MedicalHistoryPoint>();
    for (const inv of invoices) {
      const year = inv.createdAt.getFullYear();
      if (!historyByYear.has(year)) {
        historyByYear.set(year, { year, opd: 0, pharmacy: 0, pathology: 0, radiology: 0, blood: 0, ambulance: 0 });
      }
      const p = historyByYear.get(year)!;
      if ((MODULES as readonly string[]).includes(inv.module)) {
        const rec = p as unknown as Record<string, number>;
        rec[inv.module] = (rec[inv.module] ?? 0) + 1;
      }
    }
    const medicalHistory = [...historyByYear.values()].sort((a, b) => a.year - b.year);

    return {
      header: {
        patientId: patient.id,
        patientNo: patient.patientNo,
        name: patient.name,
        photoUrl: patient.photoUrl,
        gender: patient.gender,
        age: patient.age,
        guardianName: patient.guardianName,
        phone: patient.phone,
        tpaName: patient.tpa?.name ?? null,
        tpaIdNo: patient.tpaIdNo,
        tpaValidity: patient.tpaValidity ? patient.tpaValidity.toISOString() : null,
      },
      currentVitals: vitals,
      bmi,
      allergies: patient.allergies,
      findings,
      symptoms,
      consultants: [...consultantMap.entries()].map(([id, name]) => ({ id, name })),
      visits,
      treatmentHistory: visits,
      medicalHistory,
      timeline,
    };
  }

  /** Consolidated "Patient Details" report — every OPD/IPD visit + all department bills. */
  async report(branchId: string, patientId: string): Promise<PatientReportDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
      include: { tpa: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const [opdVisits, ipdAdmissions, findingRecords, invoices] = await Promise.all([
      this.prisma.opdVisit.findMany({
        where: { patientId, branchId, deletedAt: null },
        orderBy: { appointmentDate: 'desc' },
        include: { consultant: { select: { name: true } }, case: { select: { caseNo: true } } },
      }),
      this.prisma.ipdAdmission.findMany({
        where: { patientId, branchId, deletedAt: null },
        orderBy: { admissionDate: 'desc' },
        include: { consultant: { select: { name: true } }, case: { select: { caseNo: true } } },
      }),
      this.prisma.findingRecord.findMany({
        where: { patientId, branchId, deletedAt: null },
        select: { text: true, encounterType: true, encounterId: true },
      }),
      this.prisma.invoice.findMany({
        where: { patientId, branchId, deletedAt: null, module: { in: [...BILL_MODULES] } },
        orderBy: { billDate: 'desc' },
        include: { case: { select: { caseNo: true } } },
      }),
    ]);

    // Findings joined per encounter id.
    const findingsByEncounter = new Map<string, string[]>();
    for (const f of findingRecords) {
      if (!f.encounterId) continue;
      const list = findingsByEncounter.get(f.encounterId) ?? [];
      list.push(f.text);
      findingsByEncounter.set(f.encounterId, list);
    }
    const findingsFor = (id: string) => findingsByEncounter.get(id)?.join('; ') ?? null;

    // Checkup numbers per visit for the report's "OPD Checkup ID" column.
    const checkups = await this.prisma.opdCheckup.findMany({
      where: { visitId: { in: opdVisits.map((o) => o.id) }, deletedAt: null },
      orderBy: { appointmentDate: 'asc' },
      select: { visitId: true, checkupNo: true },
    });
    const checkupsByVisit = new Map<string, string[]>();
    for (const c of checkups) {
      const list = checkupsByVisit.get(c.visitId) ?? [];
      list.push(c.checkupNo);
      checkupsByVisit.set(c.visitId, list);
    }

    const opd: PatientReportVisit[] = opdVisits.map((o) => ({
      id: o.id,
      no: o.opdNo,
      caseNo: o.case?.caseNo ?? null,
      date: o.appointmentDate.toISOString(),
      doctorName: o.consultant.name,
      symptoms: o.symptoms,
      findings: findingsFor(o.id),
      checkupNos: checkupsByVisit.get(o.id)?.join(', ') ?? null,
    }));
    const ipd: PatientReportVisit[] = ipdAdmissions.map((a) => ({
      id: a.id,
      no: a.ipdNo,
      caseNo: a.case?.caseNo ?? null,
      date: a.admissionDate.toISOString(),
      doctorName: a.consultant.name,
      symptoms: a.symptoms,
      findings: findingsFor(a.id),
      // IPD has no checkup sub-entity — the column is OPD-only.
      checkupNos: null,
    }));

    const bills: PatientReportModuleGroup[] = [];
    for (const module of BILL_MODULES) {
      const rows = invoices
        .filter((i) => i.module === module)
        .map((i) => ({
          billNo: i.billNo,
          caseNo: i.case?.caseNo ?? null,
          date: i.billDate.toISOString(),
          amount: Number(i.netAmount),
          discount: Number(i.discount),
          tax: Number(i.tax),
          paid: Number(i.paid),
          refund: Number(i.refund),
          balance: Number(i.balance),
        }));
      if (rows.length === 0) continue;
      const totals = rows.reduce(
        (t, r) => ({
          amount: t.amount + r.amount,
          discount: t.discount + r.discount,
          tax: t.tax + r.tax,
          paid: t.paid + r.paid,
          refund: t.refund + r.refund,
          balance: t.balance + r.balance,
        }),
        { amount: 0, discount: 0, tax: 0, paid: 0, refund: 0, balance: 0 },
      );
      bills.push({ module, rows, totals: round(totals) });
    }

    return {
      header: {
        patientNo: patient.patientNo,
        name: patient.name,
        gender: patient.gender,
        age: patient.age,
        maritalStatus: patient.maritalStatus,
        bloodGroup: patient.bloodGroup,
        guardianName: patient.guardianName,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        tpaName: patient.tpa?.name ?? null,
        tpaIdNo: patient.tpaIdNo,
        tpaValidity: patient.tpaValidity ? patient.tpaValidity.toISOString() : null,
        allergies: patient.allergies,
      },
      opd,
      ipd,
      bills,
    };
  }
}

function round(t: Record<string, number>): PatientReportDto['bills'][number]['totals'] {
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  return {
    amount: r2(t.amount!),
    discount: r2(t.discount!),
    tax: r2(t.tax!),
    paid: r2(t.paid!),
    refund: r2(t.refund!),
    balance: r2(t.balance!),
  };
}
