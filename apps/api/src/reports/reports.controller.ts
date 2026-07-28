import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { REPORT_CATEGORIES } from '@smart-hospital/shared';
import { ReportsService } from './reports.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('categories')
  @RequirePermission('reports', 'view')
  categories() {
    return REPORT_CATEGORIES;
  }

  @Get(':key')
  @RequirePermission('reports', 'view')
  run(
    @BranchId() branchId: string,
    @Param('key') key: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.run(key, branchId, from, to);
  }
}
