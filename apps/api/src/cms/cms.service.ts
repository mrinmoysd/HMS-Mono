import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  frontCmsSettingSchema, publicSiteIdentity,
  type CmsBannerDto, type CmsBannerInput, type CmsMenuDto, type CmsMenuInput,
  type CmsPageDto, type CmsPageInput, type ListQuery, type Paginated,
  type PublicSiteDto,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { GeneralSettingsCache } from '../settings/general-settings.cache';
import { FRONT_CMS_SETTING_KEY } from '../settings/setting-keys';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly generalSettings: GeneralSettingsCache,
  ) {}

  // ── Pages ────────────────────────────────────────────────────
  async listPages(branchId: string, query: ListQuery): Promise<Paginated<CmsPageDto>> {
    const { skip, take, orderBy } = toPrismaPage(query);
    const where: Prisma.CmsPageWhereInput = { branchId, deletedAt: null, ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.cmsPage.findMany({ where, skip, take, orderBy }),
      this.prisma.cmsPage.count({ where }),
    ]);
    return paginate(rows.map(toPage), total, query);
  }

  async createPage(user: RequestUser, branchId: string, input: CmsPageInput): Promise<CmsPageDto> {
    const p = await this.prisma.cmsPage.create({ data: { branchId, ...input, body: input.body || null, createdById: user.id } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'cms_page', entityId: p.id });
    return toPage(p);
  }

  // ── Banners ──────────────────────────────────────────────────
  async listBanners(branchId: string): Promise<CmsBannerDto[]> {
    const rows = await this.prisma.cmsBanner.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    return rows.map((b) => ({ id: b.id, title: b.title, imageUrl: b.imageUrl, link: b.link, sortOrder: b.sortOrder, active: b.active }));
  }
  async createBanner(user: RequestUser, branchId: string, input: CmsBannerInput): Promise<CmsBannerDto> {
    const b = await this.prisma.cmsBanner.create({ data: { branchId, title: input.title, imageUrl: input.imageUrl || null, link: input.link || null, sortOrder: input.sortOrder, active: input.active } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'cms_banner', entityId: b.id });
    return { id: b.id, title: b.title, imageUrl: b.imageUrl, link: b.link, sortOrder: b.sortOrder, active: b.active };
  }

  // ── Menus ────────────────────────────────────────────────────
  async listMenus(branchId: string): Promise<CmsMenuDto[]> {
    const rows = await this.prisma.cmsMenu.findMany({ where: { branchId, deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    return rows.map((m) => ({ id: m.id, label: m.label, url: m.url, sortOrder: m.sortOrder }));
  }
  async createMenu(user: RequestUser, branchId: string, input: CmsMenuInput): Promise<CmsMenuDto> {
    const m = await this.prisma.cmsMenu.create({ data: { branchId, label: input.label, url: input.url, sortOrder: input.sortOrder } });
    await this.audit.record({ branchId, userId: user.id, action: 'create', entity: 'cms_menu', entityId: m.id });
    return { id: m.id, label: m.label, url: m.url, sortOrder: m.sortOrder };
  }

  // ── Public (no auth) — powers the marketing site ─────────────

  /**
   * The home branch, plus its Front CMS setting.
   *
   * The public endpoints have no caller and therefore no branch, so the home
   * branch is the one whose settings decide what the internet sees.
   */
  private async publicContext() {
    const home = await this.prisma.branch.findFirst({ where: { isHome: true } });
    if (!home) return null;
    const [setting, general] = await Promise.all([
      this.settings.get(home.id, FRONT_CMS_SETTING_KEY, frontCmsSettingSchema),
      this.generalSettings.get(home.id),
    ]);
    return { branchId: home.id, setting, hospitalName: general.hospitalName };
  }

  /**
   * The public site payload, or a 404 when the site is switched off.
   *
   * Off is a real 404 rather than an empty payload: a disabled site should be
   * indistinguishable from one that was never set up, and handing back
   * `{menus:[],pages:[]}` tells a crawler there is something here to come back
   * for.
   */
  async publicSite(): Promise<PublicSiteDto> {
    const ctx = await this.publicContext();
    if (!ctx || !ctx.setting.enabled) throw new NotFoundException('Not found');
    const { branchId } = ctx;
    const [menus, banners, pages] = await Promise.all([
      this.listMenus(branchId),
      this.prisma.cmsBanner.findMany({ where: { branchId, deletedAt: null, active: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.cmsPage.findMany({ where: { branchId, deletedAt: null, published: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      enabled: true,
      site: publicSiteIdentity(ctx.setting, ctx.hospitalName),
      menus,
      banners: banners.map((b) => ({ id: b.id, title: b.title, imageUrl: b.imageUrl, link: b.link, sortOrder: b.sortOrder, active: b.active })),
      pages: pages.map(toPage),
    };
  }

  async publicPage(slug: string): Promise<CmsPageDto> {
    const ctx = await this.publicContext();
    if (!ctx || !ctx.setting.enabled) throw new NotFoundException('Page not found');
    const page = await this.prisma.cmsPage.findFirst({
      where: { branchId: ctx.branchId, slug, published: true, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    return toPage(page);
  }
}

function toPage(p: { id: string; title: string; slug: string; pageType: string; body: string | null; published: boolean }): CmsPageDto {
  return { id: p.id, title: p.title, slug: p.slug, pageType: p.pageType, body: p.body, published: p.published };
}
