import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PermissionKey } from '@smart-hospital/shared';
import { DashboardService } from './dashboard.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
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
  // Notification Center is `11111111` — every role has it — which makes it the
  // right gate for the dashboard shell. The payload itself is already scoped
  // per widget inside the service; this only says "you have a dashboard".
  @Get('overview')
  @RequireFeature('dashboard.notification_center', 'view')
  overview(@BranchId() branchId: string, @CurrentUser() user: RequestUser) {
    return this.dashboard.overview(branchId, (user.permissions ?? []) as PermissionKey[]);
  }
}
