import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  cmsBannerSchema, cmsMenuSchema, cmsPageSchema, listQuerySchema,
  type CmsBannerInput, type CmsMenuInput, type CmsPageInput, type ListQuery,
} from '@smart-hospital/shared';
import { CmsService } from './cms.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('front-cms')
@ApiBearerAuth()
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('pages')
  @RequireFeature('front_cms.pages', 'view')
  listPages(@BranchId() b: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.cms.listPages(b, q);
  }
  @Post('pages')
  @RequireFeature('front_cms.pages', 'add')
  createPage(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(cmsPageSchema)) body: CmsPageInput) {
    return this.cms.createPage(u, b, body);
  }

  @Get('banners')
  @RequireFeature('front_cms.banner_images', 'view')
  listBanners(@BranchId() b: string) {
    return this.cms.listBanners(b);
  }
  @Post('banners')
  @RequireFeature('front_cms.banner_images', 'add')
  createBanner(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(cmsBannerSchema)) body: CmsBannerInput) {
    return this.cms.createBanner(u, b, body);
  }

  @Get('menus')
  @RequireFeature('front_cms.menus', 'view')
  listMenus(@BranchId() b: string) {
    return this.cms.listMenus(b);
  }
  @Post('menus')
  @RequireFeature('front_cms.menus', 'add')
  createMenu(@CurrentUser() u: RequestUser, @BranchId() b: string, @Body(new ZodValidationPipe(cmsMenuSchema)) body: CmsMenuInput) {
    return this.cms.createMenu(u, b, body);
  }

  // Public marketing site (no auth)
  @Public()
  @Get('public/site')
  publicSite() {
    return this.cms.publicSite();
  }
  @Public()
  @Get('public/pages/:slug')
  publicPage(@Param('slug') slug: string) {
    return this.cms.publicPage(slug);
  }
}
