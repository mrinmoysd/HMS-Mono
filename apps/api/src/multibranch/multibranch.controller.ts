import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { branchSchema, branchUpdateSchema, type BranchInput, type BranchUpdateInput } from '@smart-hospital/shared';
import { MultiBranchService } from './multibranch.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('multi-branch')
@ApiBearerAuth()
@Controller('multibranch')
export class MultiBranchController {
  constructor(private readonly mb: MultiBranchService) {}

  @Get('branches')
  @RequireFeature('multi_branch.setting', 'view')
  listBranches() {
    return this.mb.listBranches();
  }

  // Every Multi Branch row in the spec is `10000000` — Admin, view only. There
  // is no add/edit/delete toggle anywhere in the group, so branch writes hang
  // off `view`, the only bit that exists. Same call as Lab Investigation.
  //
  // R1 asked for add/edit/delete here, which no role can hold, so Admin lost
  // the ability to manage branches entirely. Caught by the R5 matrix, which
  // asserts that Admin can reach every route and that a declared action is one
  // the feature actually exposes.
  @Post('branches')
  @RequireFeature('multi_branch.setting', 'view')
  createBranch(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(branchSchema)) body: BranchInput) {
    return this.mb.createBranch(user, body);
  }

  @Patch('branches/:id')
  @RequireFeature('multi_branch.setting', 'view')
  updateBranch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body(new ZodValidationPipe(branchUpdateSchema)) body: BranchUpdateInput) {
    return this.mb.updateBranch(user, id, body);
  }

  @Delete('branches/:id')
  @HttpCode(204)
  @RequireFeature('multi_branch.setting', 'view')
  removeBranch(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mb.removeBranch(user, id);
  }

  @Get('overview')
  @RequireFeature('multi_branch.overview', 'view')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.mb.overview(from, to);
  }
}
