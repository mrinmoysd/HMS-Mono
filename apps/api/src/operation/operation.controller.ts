import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { listQuerySchema, type ListQuery } from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { paginate, toPrismaPage } from '../common/pagination';
import { AuditService } from '../common/audit/audit.service';
import type { RequestUser } from '../common/types/request-user';

const operationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categoryId: z.string().uuid().optional().nullable(),
});

/** Operation Theatre master (Setup → Operations, FRD §2.27/§2.29.2). */
@ApiTags('operations')
@ApiBearerAuth()
@Controller('operations')
export class OperationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('setup', 'view')
  async list(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    const { skip, take, orderBy } = toPrismaPage(q);
    const where = {
      branchId,
      deletedAt: null,
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.operation.findMany({ where, skip, take, orderBy, include: { category: true } }),
      this.prisma.operation.count({ where }),
    ]);
    return paginate(
      rows.map((o) => ({
        id: o.id,
        name: o.name,
        categoryId: o.categoryId,
        categoryName: o.category?.name ?? null,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
      q,
    );
  }

  @Post()
  @RequirePermission('setup', 'add')
  async create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(operationSchema)) body: z.infer<typeof operationSchema>,
  ) {
    const op = await this.prisma.operation.create({
      data: { branchId, name: body.name, categoryId: body.categoryId ?? null },
      include: { category: true },
    });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'operation', entityId: op.id });
    return { id: op.id, name: op.name, categoryId: op.categoryId, categoryName: op.category?.name ?? null, createdAt: op.createdAt.toISOString() };
  }
}
