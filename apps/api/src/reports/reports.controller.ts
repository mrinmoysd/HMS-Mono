import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequireFeatureFor } from '../rbac/require-feature.decorator';
import { reportFeature, visibleReportCategories } from './reports-features';
import { abilityOf } from '../rbac/ability-of';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { Authenticated } from '../rbac/authenticated.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * The catalogue, narrowed to the reports this user may run. There is no
   * single feature meaning "may see the reports menu" — each report is its own
   * feature — so the filter is the gate.
   */
  @Authenticated()
  @Get('categories')
  categories(@CurrentUser() user: RequestUser) {
    return visibleReportCategories(abilityOf(user));
  }

  @Get(':key')
  @RequireFeatureFor((c) => reportFeature(c.params.key))
  run(
    @BranchId() branchId: string,
    @Param('key') key: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.run(key, branchId, from, to);
  }
}
