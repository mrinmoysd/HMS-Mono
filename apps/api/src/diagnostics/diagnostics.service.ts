import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DiagnosticBillInput,
  DiagnosticCategoryDto,
  DiagnosticCategoryInput,
  DiagnosticTestDto,
  DiagnosticTestInput,
  DiagnosticUnitDto,
  DiagnosticUnitInput,
  InvoiceDto,
  ListQuery,
  Modality,
  Paginated,
  PreviousReportRow,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoiceService } from '../billing/invoice.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

const testInclude = {
  category: true,
  unit: true,
  chargeRef: { include: { category: true, taxCategory: true } },
  parameters: { orderBy: { order: 'asc' as const } },
} satisfies Prisma.DiagnosticTestInclude;

type TestRow = Prisma.DiagnosticTestGetPayload<{ include: typeof testInclude }>;

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoices: InvoiceService,
  ) {}

  async listTests(branchId: string, modality: Modality, query: ListQuery): Promise<Paginated<DiagnosticTestDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.DiagnosticTestWhereInput = {
      branchId,
      modality,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.diagnosticTest.findMany({ where, skip, take, orderBy, include: testInclude }),
      this.prisma.diagnosticTest.count({ where }),
    ]);
    return paginate(rows.map(toTestDto), total, query);
  }

  async getTest(branchId: string, modality: Modality, id: string): Promise<DiagnosticTestDto> {
    const test = await this.prisma.diagnosticTest.findFirst({
      where: { id, branchId, modality, deletedAt: null },
      include: testInclude,
    });
    if (!test) throw new NotFoundException('Test not found');
    return toTestDto(test);
  }

  async createTest(user: RequestUser, branchId: string, input: DiagnosticTestInput): Promise<DiagnosticTestDto> {
    const test = await this.prisma.diagnosticTest.create({
      data: {
        branchId,
        modality: input.modality,
        categoryId: input.categoryId ?? null,
        name: input.name,
        shortName: input.shortName || null,
        testType: input.testType || null,
        subCategory: input.subCategory || null,
        method: input.method || null,
        reportDays: input.reportDays,
        chargeId: input.chargeId ?? null,
        unitId: input.unitId ?? null,
        referenceRange: input.referenceRange || null,
        refMin: input.refMin ?? null,
        refMax: input.refMax ?? null,
        description: input.description || null,
        charge: input.charge,
        parameters: {
          create: input.parameters.map((p, i) => ({
            parameterName: p.parameterName,
            referenceRange: p.referenceRange || null,
            unit: p.unit || null,
            order: i,
          })),
        },
      },
      include: testInclude,
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: `${input.modality}_test`, entityId: test.id });
    return toTestDto(test);
  }

  async updateTest(
    user: RequestUser,
    branchId: string,
    id: string,
    input: DiagnosticTestInput,
  ): Promise<DiagnosticTestDto> {
    const existing = await this.prisma.diagnosticTest.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Test not found');
    const test = await this.prisma.$transaction(async (tx) => {
      await tx.diagnosticTestParameter.deleteMany({ where: { testId: id } });
      return tx.diagnosticTest.update({
        where: { id },
        data: {
          categoryId: input.categoryId ?? null,
          name: input.name,
          shortName: input.shortName || null,
          testType: input.testType || null,
          subCategory: input.subCategory || null,
          method: input.method || null,
          reportDays: input.reportDays,
          chargeId: input.chargeId ?? null,
          unitId: input.unitId ?? null,
          referenceRange: input.referenceRange || null,
          refMin: input.refMin ?? null,
          refMax: input.refMax ?? null,
          description: input.description || null,
          charge: input.charge,
          parameters: {
            create: input.parameters.map((p, i) => ({
              parameterName: p.parameterName,
              referenceRange: p.referenceRange || null,
              unit: p.unit || null,
              order: i,
            })),
          },
        },
        include: testInclude,
      });
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: `${input.modality}_test`, entityId: id });
    return toTestDto(test);
  }

  async removeTest(user: RequestUser, branchId: string, modality: Modality, id: string): Promise<void> {
    const existing = await this.prisma.diagnosticTest.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Test not found');
    await this.prisma.diagnosticTest.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: `${modality}_test`, entityId: id });
  }

  // ── Category (modality-scoped master) ─────────────────────────
  async listCategories(branchId: string, modality: Modality, query: ListQuery): Promise<Paginated<DiagnosticCategoryDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.DiagnosticCategoryWhereInput = {
      branchId,
      modality,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.diagnosticCategory.findMany({ where, skip, take, orderBy }),
      this.prisma.diagnosticCategory.count({ where }),
    ]);
    return paginate(rows.map(toModalityDto), total, query);
  }

  async createCategory(user: RequestUser, branchId: string, input: DiagnosticCategoryInput): Promise<DiagnosticCategoryDto> {
    const c = await this.prisma.diagnosticCategory.create({ data: { branchId, modality: input.modality, name: input.name } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: `${input.modality}_category`, entityId: c.id });
    return toModalityDto(c);
  }

  async updateCategory(user: RequestUser, branchId: string, id: string, input: DiagnosticCategoryInput): Promise<DiagnosticCategoryDto> {
    const existing = await this.prisma.diagnosticCategory.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Category not found');
    const c = await this.prisma.diagnosticCategory.update({ where: { id }, data: { name: input.name } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: `${input.modality}_category`, entityId: id });
    return toModalityDto(c);
  }

  async removeCategory(user: RequestUser, branchId: string, modality: Modality, id: string): Promise<void> {
    const existing = await this.prisma.diagnosticCategory.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.diagnosticCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: `${modality}_category`, entityId: id });
  }

  // ── Unit (modality-scoped master) ─────────────────────────────
  async listUnits(branchId: string, modality: Modality, query: ListQuery): Promise<Paginated<DiagnosticUnitDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.DiagnosticUnitWhereInput = {
      branchId,
      modality,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.diagnosticUnit.findMany({ where, skip, take, orderBy }),
      this.prisma.diagnosticUnit.count({ where }),
    ]);
    return paginate(rows.map(toModalityDto), total, query);
  }

  async createUnit(user: RequestUser, branchId: string, input: DiagnosticUnitInput): Promise<DiagnosticUnitDto> {
    const u = await this.prisma.diagnosticUnit.create({ data: { branchId, modality: input.modality, name: input.name } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: `${input.modality}_unit`, entityId: u.id });
    return toModalityDto(u);
  }

  async updateUnit(user: RequestUser, branchId: string, id: string, input: DiagnosticUnitInput): Promise<DiagnosticUnitDto> {
    const existing = await this.prisma.diagnosticUnit.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Unit not found');
    const u = await this.prisma.diagnosticUnit.update({ where: { id }, data: { name: input.name } });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: `${input.modality}_unit`, entityId: id });
    return toModalityDto(u);
  }

  async removeUnit(user: RequestUser, branchId: string, modality: Modality, id: string): Promise<void> {
    const existing = await this.prisma.diagnosticUnit.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Unit not found');
    await this.prisma.diagnosticUnit.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: `${modality}_unit`, entityId: id });
  }

  async generateBill(user: RequestUser, branchId: string, input: DiagnosticBillInput): Promise<InvoiceDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const caseId = patient.cases[0]?.id ?? null;

    const invoice = await this.invoices.create({
      branchId,
      patientId: input.patientId,
      caseId,
      module: input.modality,
      tpaId: input.applyTpa ? patient.tpaId : null,
      consultantId: input.consultantId ?? null,
      referenceDoctor: input.referenceDoctor || null,
      prescriptionNo: input.prescriptionNo || null,
      items: input.items.map((it) => ({
        chargeId: it.testId ?? null,
        name: it.resultValue ? `${it.name} = ${it.resultValue}` : it.name,
        standardCharge: it.appliedCharge,
        appliedCharge: it.appliedCharge,
        qty: it.qty,
        discountPct: it.discountPct,
        taxPct: it.taxPct,
      })),
      note: input.note || null,
      createdById: user.id,
      initialPayment: input.payment && input.payment.amount > 0 ? input.payment : null,
    });
    const full = await this.invoices.get(branchId, invoice.id);

    if (full.items?.length) {
      const testIds = [...new Set(input.items.map((it) => it.testId).filter((x): x is string => !!x))];
      const tests = testIds.length
        ? await this.prisma.diagnosticTest.findMany({ where: { id: { in: testIds } }, include: { unit: true } })
        : [];
      const testMap = new Map(tests.map((t) => [t.id, t]));
      const rows = input.items.map((it, i) => {
        const invItem = full.items?.[i];
        const test = it.testId ? testMap.get(it.testId) : undefined;
        const sampleDate = new Date();
        const expectedDate = new Date(sampleDate);
        expectedDate.setDate(expectedDate.getDate() + (it.reportDays ?? test?.reportDays ?? 1));
        return {
          branchId,
          patientId: input.patientId,
          modality: input.modality,
          testId: it.testId ?? null,
          testName: it.name,
          unit: test?.unit?.name ?? null,
          referenceRange: test?.referenceRange ?? null,
          sampleDate,
          expectedDate,
          status: 'pending',
          invoiceId: invoice.id,
          invoiceItemId: invItem?.id ?? null,
          tax: round2(it.appliedCharge * it.qty * (1 - it.discountPct / 100) * (it.taxPct / 100)),
          netAmount: invItem?.amount ?? 0,
          createdById: user.id,
        };
      });
      await this.prisma.labInvestigation.createMany({ data: rows });
    }

    await this.audit.record({ branchId, userId: user.id, action: 'bill', entity: input.modality, entityId: invoice.id });
    return full;
  }

  /** "Previous Report Value" history — prior test results for this patient in this modality. */
  async previousReports(branchId: string, modality: Modality, patientId: string, excludeInvoiceId?: string): Promise<PreviousReportRow[]> {
    const rows = await this.prisma.labInvestigation.findMany({
      where: {
        branchId,
        patientId,
        modality,
        deletedAt: null,
        ...(excludeInvoiceId ? { invoiceId: { not: excludeInvoiceId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const approverIds = [...new Set(rows.map((r) => r.approvedById).filter((x): x is string => !!x))];
    const approvers = approverIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: approverIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(approvers.map((a) => [a.id, a.name]));
    return rows.map((r) => ({
      id: r.id,
      testName: r.testName,
      sampleCollected: r.sampleDate ? r.sampleDate.toISOString() : null,
      reportDate: r.expectedDate ? r.expectedDate.toISOString() : null,
      approvedByName: r.approvedById ? names.get(r.approvedById) ?? null : null,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      tax: r.tax != null ? Number(r.tax) : null,
      netAmount: r.netAmount != null ? Number(r.netAmount) : null,
      status: r.status,
    }));
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toTestDto(t: TestRow): DiagnosticTestDto {
  return {
    id: t.id,
    modality: t.modality,
    name: t.name,
    shortName: t.shortName,
    testType: t.testType,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    subCategory: t.subCategory,
    method: t.method,
    reportDays: t.reportDays ?? 1,
    chargeId: t.chargeId,
    chargeName: t.chargeRef?.name ?? null,
    chargeCategoryName: t.chargeRef?.category?.name ?? null,
    taxPercent: t.chargeRef?.taxCategory ? Number(t.chargeRef.taxCategory.percent) : 0,
    standardCharge: t.chargeRef ? Number(t.chargeRef.standardCharge) : 0,
    unitId: t.unitId,
    unitName: t.unit?.name ?? null,
    referenceRange: t.referenceRange,
    refMin: t.refMin != null ? Number(t.refMin) : null,
    refMax: t.refMax != null ? Number(t.refMax) : null,
    description: t.description,
    charge: Number(t.charge),
    parameters: t.parameters.map((p) => ({
      id: p.id,
      parameterName: p.parameterName,
      referenceRange: p.referenceRange,
      unit: p.unit,
    })),
  };
}

function toModalityDto(m: { id: string; modality: string; name: string; createdAt: Date }): DiagnosticCategoryDto {
  return { id: m.id, modality: m.modality, name: m.name, createdAt: m.createdAt.toISOString() };
}
