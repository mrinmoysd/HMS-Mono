import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { branchSchema, branchUpdateSchema, type BranchInput, type BranchUpdateInput } from '@smart-hospital/shared';
import { MultiBranchService } from './multibranch.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('multi-branch')
@ApiBearerAuth()
@Controller('multibranch')
export class MultiBranchController {
  constructor(private readonly mb: MultiBranchService) {}

  @Get('branches')
  @RequirePermission('multi_branch', 'view')
  listBranches() {
    return this.mb.listBranches();
  }

  @Post('branches')
  @RequirePermission('multi_branch', 'add')
  createBranch(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(branchSchema)) body: BranchInput) {
    return this.mb.createBranch(user, body);
  }

  @Patch('branches/:id')
  @RequirePermission('multi_branch', 'edit')
  updateBranch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body(new ZodValidationPipe(branchUpdateSchema)) body: BranchUpdateInput) {
    return this.mb.updateBranch(user, id, body);
  }

  @Delete('branches/:id')
  @HttpCode(204)
  @RequirePermission('multi_branch', 'delete')
  removeBranch(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mb.removeBranch(user, id);
  }

  @Get('overview')
  @RequirePermission('multi_branch', 'view')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.mb.overview(from, to);
  }
}
