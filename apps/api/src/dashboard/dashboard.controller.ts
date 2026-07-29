import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PermissionKey } from '@smart-hospital/shared';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * One request for the whole screen, scoped to the caller's role.
   *
   * The guard only checks that the user may see *a* dashboard; which widgets
   * come back is decided inside the service from the same permission set, so a
   * doctor's response simply has no revenue figures in it — they are never
   * queried rather than queried and hidden.
   */
  @Get('overview')
  @RequirePermission('dashboard', 'view')
  overview(@BranchId() branchId: string, @CurrentUser() user: RequestUser) {
    return this.dashboard.overview(branchId, (user.permissions ?? []) as PermissionKey[]);
  }
}
