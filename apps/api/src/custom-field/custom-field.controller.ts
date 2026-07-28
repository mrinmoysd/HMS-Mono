import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { customFieldSchema, type CustomFieldInput } from '@smart-hospital/shared';
import { CustomFieldService } from './custom-field.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('custom-fields')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldController {
  constructor(private readonly fields: CustomFieldService) {}

  /** Definitions for an entity — needed by any module's Add/Edit form, so this
   *  read is available to all authenticated users (no setup permission gate). */
  @Get()
  listByEntity(@BranchId() branchId: string, @Query('entity') entity: string) {
    return this.fields.listByEntity(branchId, entity);
  }

  @Post()
  @RequirePermission('setup', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(customFieldSchema)) body: CustomFieldInput,
  ) {
    return this.fields.create(user, branchId, body);
  }

  @Patch(':id')
  @RequirePermission('setup', 'edit')
  update(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(customFieldSchema)) body: CustomFieldInput,
  ) {
    return this.fields.update(user, branchId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.fields.remove(user, branchId, id);
  }
}
