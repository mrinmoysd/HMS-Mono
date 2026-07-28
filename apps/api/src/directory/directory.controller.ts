import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { BranchId } from '../common/decorators/branch-id.decorator';

/** Lightweight people lookups used to populate form selects (doctors, etc.).
 *  A full Staff directory arrives in Phase 6; this covers Phase 2's needs. */
@ApiTags('directory')
@ApiBearerAuth()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

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
