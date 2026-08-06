import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MODULES, MODULE_META, SIDEBAR_GROUPS } from '@smart-hospital/shared';
import { Authenticated } from '../rbac/authenticated.decorator';

/** Static app metadata used by the web to render the sidebar/nav shell. */
@ApiTags('meta')
@Controller('meta')
export class MetaController {
  // Static nav metadata compiled into the bundle — no branch data, no rows.
  // The sidebar filters itself from the caller's own permissions.
  @Authenticated()
  @Get('modules')
  modules() {
    return {
      groups: SIDEBAR_GROUPS,
      modules: MODULES.map((key) => ({ key, ...MODULE_META[key] })),
    };
  }
}
