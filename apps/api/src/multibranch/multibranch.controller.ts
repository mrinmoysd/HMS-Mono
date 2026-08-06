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

  @Post('branches')
  @RequireFeature('multi_branch.setting', 'add')
  createBranch(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(branchSchema)) body: BranchInput) {
    return this.mb.createBranch(user, body);
  }

  @Patch('branches/:id')
  @RequireFeature('multi_branch.setting', 'edit')
  updateBranch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body(new ZodValidationPipe(branchUpdateSchema)) body: BranchUpdateInput) {
    return this.mb.updateBranch(user, id, body);
  }

  @Delete('branches/:id')
  @HttpCode(204)
  @RequireFeature('multi_branch.setting', 'delete')
  removeBranch(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mb.removeBranch(user, id);
  }

  @Get('overview')
  @RequireFeature('multi_branch.overview', 'view')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.mb.overview(from, to);
  }
}
