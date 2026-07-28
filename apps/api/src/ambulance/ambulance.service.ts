import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AmbulanceCallDto,
  AmbulanceCallInput,
  AmbulanceVehicleDto,
  AmbulanceVehicleInput,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoiceService } from '../billing/invoice.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

const callInclude = {
  vehicle: { select: { vehicleNo: true, model: true, driverName: true, driverContact: true } },
  charge: { select: { name: true, category: { select: { name: true } } } },
} satisfies Prisma.AmbulanceCallInclude;
type CallRow = Prisma.AmbulanceCallGetPayload<{ include: typeof callInclude }>;

@Injectable()
export class AmbulanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoices: InvoiceService,
  ) {}

  // ── Fleet ────────────────────────────────────────────────────
  async listVehicles(branchId: string, query: ListQuery): Promise<Paginated<AmbulanceVehicleDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.AmbulanceVehicleWhereInput = {
      branchId,
      deletedAt: null,
      ...(query.search ? { vehicleNo: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ambulanceVehicle.findMany({ where, skip, take, orderBy }),
      this.prisma.ambulanceVehicle.count({ where }),
    ]);
    return paginate(rows.map(toVehicleDto), total, query);
  }

  async createVehicle(user: RequestUser, branchId: string, input: AmbulanceVehicleInput): Promise<AmbulanceVehicleDto> {
    const v = await this.prisma.ambulanceVehicle.create({
      data: {
        branchId,
        vehicleNo: input.vehicleNo,
        model: input.model,
        year: input.year ?? null,
        driverName: input.driverName || null,
        driverLicense: input.driverLicense || null,
        driverContact: input.driverContact || null,
        vehicleType: input.vehicleType,
        note: input.note || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'ambulance_vehicle', entityId: v.id });
    return toVehicleDto(v);
  }

  async updateVehicle(user: RequestUser, branchId: string, id: string, input: AmbulanceVehicleInput): Promise<AmbulanceVehicleDto> {
    const existing = await this.prisma.ambulanceVehicle.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Vehicle not found');
    const v = await this.prisma.ambulanceVehicle.update({
      where: { id },
      data: {
        vehicleNo: input.vehicleNo,
        model: input.model,
        year: input.year ?? null,
        driverName: input.driverName || null,
        driverLicense: input.driverLicense || null,
        driverContact: input.driverContact || null,
        vehicleType: input.vehicleType,
        note: input.note || null,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'ambulance_vehicle', entityId: id });
    return toVehicleDto(v);
  }

  async removeVehicle(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.ambulanceVehicle.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Vehicle not found');
    await this.prisma.ambulanceVehicle.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'ambulance_vehicle', entityId: id });
  }

  // ── Calls (fare billed via invoice engine) ───────────────────
  async listCalls(branchId: string, query: ListQuery): Promise<Paginated<AmbulanceCallDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    let patientFilter: Prisma.AmbulanceCallWhereInput = {};
    if (query.search) {
      const patients = await this.prisma.patient.findMany({
        where: { branchId, deletedAt: null, name: { contains: query.search, mode: 'insensitive' } },
        select: { id: true },
      });
      patientFilter = {
        OR: [
          { patientId: { in: patients.map((p) => p.id) } },
          { vehicle: { vehicleNo: { contains: query.search, mode: 'insensitive' } } },
        ],
      };
    }
    const where: Prisma.AmbulanceCallWhereInput = { branchId, deletedAt: null, ...patientFilter };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ambulanceCall.findMany({ where, skip, take, orderBy, include: callInclude }),
      this.prisma.ambulanceCall.count({ where }),
    ]);
    const invoices = await Promise.all(rows.filter((r) => r.invoiceId).map((r) => this.invoices.get(branchId, r.invoiceId!)));
    const invMap = new Map(invoices.map((i) => [i.id, i]));
    const patientIds = [...new Set(rows.map((r) => r.patientId).filter((x): x is string => !!x))];
    const patients = patientIds.length
      ? await this.prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, patientNo: true } })
      : [];
    const patientNoMap = new Map(patients.map((p) => [p.id, p.patientNo]));
    return paginate(
      rows.map((r) => this.toCallDto(r, invMap.get(r.invoiceId!)!, r.patientId ? patientNoMap.get(r.patientId) ?? null : null)),
      total,
      query,
    );
  }

  async getCall(branchId: string, id: string): Promise<AmbulanceCallDto> {
    const row = await this.prisma.ambulanceCall.findFirst({ where: { id, branchId, deletedAt: null }, include: callInclude });
    if (!row || !row.invoiceId) throw new NotFoundException('Ambulance call not found');
    const inv = await this.invoices.get(branchId, row.invoiceId);
    const patient = row.patientId ? await this.prisma.patient.findUnique({ where: { id: row.patientId }, select: { patientNo: true } }) : null;
    return this.toCallDto(row, inv, patient?.patientNo ?? null);
  }

  private toCallDto(row: CallRow, inv: Awaited<ReturnType<InvoiceService['get']>>, patientNo: string | null = null): AmbulanceCallDto {
    return {
      id: row.id,
      invoiceId: inv.id,
      billNo: inv.billNo,
      caseNo: inv.caseNo,
      patientId: inv.patientId,
      patientName: inv.patientName,
      patientNo,
      patientAddress: row.patientAddress,
      vehicleId: row.vehicleId,
      vehicleNo: row.vehicle.vehicleNo,
      vehicleModel: row.vehicle.model,
      driverName: row.vehicle.driverName,
      driverContact: row.vehicle.driverContact,
      chargeId: row.chargeId,
      chargeName: row.charge?.name ?? null,
      chargeCategoryName: row.charge?.category?.name ?? null,
      standardCharge: row.standardCharge ? Number(row.standardCharge) : 0,
      note: row.note,
      date: row.date.toISOString(),
      subtotal: inv.subtotal,
      discount: inv.discount,
      tax: inv.tax,
      netAmount: inv.netAmount,
      paid: inv.paid,
      balance: inv.balance,
      createdByName: inv.createdByName,
    };
  }

  async createCall(user: RequestUser, branchId: string, input: AmbulanceCallInput): Promise<AmbulanceCallDto> {
    const vehicle = await this.prisma.ambulanceVehicle.findFirst({ where: { id: input.vehicleId, branchId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, branchId, deletedAt: null },
      include: { cases: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const charge = await this.prisma.charge.findFirst({ where: { id: input.chargeId, branchId, deletedAt: null } });
    if (!charge) throw new NotFoundException('Charge not found');
    const caseId = patient.cases[0]?.id ?? null;

    const created = await this.prisma.$transaction(async (tx) => {
      const inv = await this.invoices.create(
        {
          branchId,
          patientId: input.patientId,
          caseId,
          module: 'ambulance',
          note: input.note || null,
          items: [
            {
              chargeId: charge.id,
              name: charge.name,
              standardCharge: input.standardCharge,
              appliedCharge: input.standardCharge,
              qty: 1,
              discountPct: input.discountPct,
              taxPct: input.taxPct,
            },
          ],
          createdById: user.id,
          initialPayment: input.payment && input.payment.amount > 0 ? input.payment : null,
        },
        tx,
      );
      return tx.ambulanceCall.create({
        data: {
          branchId,
          vehicleId: input.vehicleId,
          patientId: input.patientId,
          caseId,
          chargeId: charge.id,
          invoiceId: inv.id,
          patientName: patient.name,
          patientAddress: input.patientAddress || null,
          standardCharge: input.standardCharge,
          discountPct: input.discountPct,
          taxPct: input.taxPct,
          note: input.note || null,
          date: input.date,
          createdById: user.id,
        },
        include: callInclude,
      });
    });

    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'ambulance_call', entityId: created.id });
    const inv = await this.invoices.get(branchId, created.invoiceId!);
    return this.toCallDto(created, inv, patient.patientNo);
  }
}

function toVehicleDto(v: {
  id: string; vehicleNo: string; model: string | null; year: number | null; driverName: string | null;
  driverLicense: string | null; driverContact: string | null; vehicleType: string | null; note: string | null;
}): AmbulanceVehicleDto {
  return {
    id: v.id,
    vehicleNo: v.vehicleNo,
    model: v.model,
    year: v.year,
    driverName: v.driverName,
    driverLicense: v.driverLicense,
    driverContact: v.driverContact,
    vehicleType: v.vehicleType,
    note: v.note,
  };
}
