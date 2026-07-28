import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CustomFieldDto, CustomFieldInput, CustomFieldType } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class CustomFieldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** All custom-field definitions for an entity (ordered), used by forms & lists. */
  async listByEntity(branchId: string, entity: string): Promise<CustomFieldDto[]> {
    const rows = await this.prisma.customField.findMany({
      where: { branchId, entity, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDto);
  }

  async create(user: RequestUser, branchId: string, input: CustomFieldInput): Promise<CustomFieldDto> {
    const key = await this.uniqueKey(branchId, input.entity, input.label);
    const row = await this.prisma.customField.create({
      data: { ...input, key, branchId, options: input.options },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'custom_field', entityId: row.id });
    return toDto(row);
  }

  async update(user: RequestUser, branchId: string, id: string, input: CustomFieldInput): Promise<CustomFieldDto> {
    const existing = await this.prisma.customField.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Custom field not found');
    // key stays stable so existing stored values keep resolving.
    const row = await this.prisma.customField.update({
      where: { id },
      data: {
        label: input.label,
        fieldType: input.fieldType,
        options: input.options,
        gridWidth: input.gridWidth,
        required: input.required,
        visibleTable: input.visibleTable,
        visiblePrint: input.visiblePrint,
        visibleReport: input.visibleReport,
        visiblePatientPanel: input.visiblePatientPanel,
        sortOrder: input.sortOrder,
      },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'update', entity: 'custom_field', entityId: id });
    return toDto(row);
  }

  async remove(user: RequestUser, branchId: string, id: string): Promise<void> {
    const existing = await this.prisma.customField.findFirst({ where: { id, branchId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Custom field not found');
    await this.prisma.customField.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ branchId, userId: user.id, action: 'delete', entity: 'custom_field', entityId: id });
  }

  private async uniqueKey(branchId: string, entity: string, label: string): Promise<string> {
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'field';
    let key = base;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.customField.findFirst({ where: { branchId, entity, key, deletedAt: null } })) {
      key = `${base}_${n++}`;
    }
    return key;
  }
}

function toDto(row: {
  id: string;
  entity: string;
  label: string;
  key: string;
  fieldType: string;
  options: Prisma.JsonValue;
  gridWidth: number;
  required: boolean;
  visibleTable: boolean;
  visiblePrint: boolean;
  visibleReport: boolean;
  visiblePatientPanel: boolean;
  sortOrder: number;
}): CustomFieldDto {
  return {
    id: row.id,
    entity: row.entity,
    label: row.label,
    key: row.key,
    fieldType: row.fieldType as CustomFieldType,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    gridWidth: row.gridWidth,
    required: row.required,
    visibleTable: row.visibleTable,
    visiblePrint: row.visiblePrint,
    visibleReport: row.visibleReport,
    visiblePatientPanel: row.visiblePatientPanel,
    sortOrder: row.sortOrder,
  };
}
