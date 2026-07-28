import {
  BadRequestException,
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
import {
  NAME_CATALOGS,
  listQuerySchema,
  nameCatalogSchema,
  type ListQuery,
  type NameCatalogInput,
  type NameCatalogKey,
} from '@smart-hospital/shared';
import { CatalogService } from './catalog.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

function assertCatalog(catalog: string): NameCatalogKey {
  if (!(NAME_CATALOGS as readonly string[]).includes(catalog)) {
    throw new BadRequestException(`Unknown catalog: ${catalog}`);
  }
  return catalog as NameCatalogKey;
}

/** Generic name-catalog CRUD under Setup. Guarded by the `setup` module. */
@ApiTags('masters')
@ApiBearerAuth()
@Controller('masters/:catalog')
export class CatalogController {
  constructor(private readonly catalogs: CatalogService) {}

  @Get()
  @RequirePermission('setup', 'view')
  list(
    @Param('catalog') catalog: string,
    @BranchId() branchId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.catalogs.list(assertCatalog(catalog), branchId, query);
  }

  @Post()
  @RequirePermission('setup', 'add')
  create(
    @Param('catalog') catalog: string,
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(nameCatalogSchema)) body: NameCatalogInput,
  ) {
    return this.catalogs.create(assertCatalog(catalog), user, branchId, body.name);
  }

  @Patch(':id')
  @RequirePermission('setup', 'edit')
  update(
    @Param('catalog') catalog: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(nameCatalogSchema)) body: NameCatalogInput,
  ) {
    return this.catalogs.update(assertCatalog(catalog), user, branchId, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('setup', 'delete')
  async remove(
    @Param('catalog') catalog: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
  ) {
    await this.catalogs.remove(assertCatalog(catalog), user, branchId, id);
  }
}
