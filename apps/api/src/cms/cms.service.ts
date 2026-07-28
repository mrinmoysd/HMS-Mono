import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CmsBannerDto, CmsBannerInput, CmsMenuDto, CmsMenuInput, CmsPageDto, CmsPageInput,
  ListQuery, Paginated,
} from '@smart-hospital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { paginate, toPrismaPage } from '../common/pagination';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
  async publicSite(): Promise<{ menus: CmsMenuDto[]; banners: CmsBannerDto[]; pages: CmsPageDto[] }> {
    const home = await this.prisma.branch.findFirst({ where: { isHome: true } });
    const branchId = home?.id;
    if (!branchId) return { menus: [], banners: [], pages: [] };
    const [menus, banners, pages] = await Promise.all([
      this.listMenus(branchId),
      this.prisma.cmsBanner.findMany({ where: { branchId, deletedAt: null, active: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.cmsPage.findMany({ where: { branchId, deletedAt: null, published: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      menus,
      banners: banners.map((b) => ({ id: b.id, title: b.title, imageUrl: b.imageUrl, link: b.link, sortOrder: b.sortOrder, active: b.active })),
      pages: pages.map(toPage),
    };
  }

  async publicPage(slug: string): Promise<CmsPageDto> {
    const home = await this.prisma.branch.findFirst({ where: { isHome: true } });
    const page = home ? await this.prisma.cmsPage.findFirst({ where: { branchId: home.id, slug, published: true, deletedAt: null } }) : null;
    if (!page) throw new NotFoundException('Page not found');
    return toPage(page);
  }
}

function toPage(p: { id: string; title: string; slug: string; pageType: string; body: string | null; published: boolean }): CmsPageDto {
  return { id: p.id, title: p.title, slug: p.slug, pageType: p.pageType, body: p.body, published: p.published };
}
