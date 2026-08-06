import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { RequireFeature } from '../rbac/require-feature.decorator';

/** Lightweight people lookups used to populate form selects (doctors, etc.).
 *  A full Staff directory arrives in Phase 6; this covers Phase 2's needs. */
@ApiTags('directory')
@ApiBearerAuth()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  // Populates doctor selects across the app. This is the Staff list narrowed
  // to one role, so it takes the Staff feature — `ff111111`, which every role
  // holds at view. It carried no decorator until R3.
  @RequireFeature('human_resource.staff', 'view')
  @Get('doctors')
  async doctors(@BranchId() branchId: string) {
    const rows = await this.prisma.user.findMany({
      where: { branchId, deletedAt: null, isActive: true, role: { slug: 'doctor' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }
}
