import { z } from 'zod';

export const CMS_PAGE_TYPES = ['standard', 'event', 'gallery'] as const;

export const cmsPageSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  slug: z.string().trim().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  pageType: z.enum(CMS_PAGE_TYPES).default('standard'),
  body: z.string().optional().or(z.literal('')),
  published: z.boolean().default(false),
});
export type CmsPageInput = z.infer<typeof cmsPageSchema>;

export const cmsBannerSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  link: z.string().url().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});
export type CmsBannerInput = z.infer<typeof cmsBannerSchema>;

export const cmsMenuSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  url: z.string().trim().min(1, 'URL is required'),
  sortOrder: z.coerce.number().int().default(0),
});
export type CmsMenuInput = z.infer<typeof cmsMenuSchema>;

export interface CmsPageDto {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  body: string | null;
  published: boolean;
}
export interface CmsBannerDto {
  id: string;
  title: string;
  imageUrl: string | null;
  link: string | null;
  sortOrder: number;
  active: boolean;
}
export interface CmsMenuDto {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

// ── Front CMS Setting ──────────────────────────────────────────────────────

/**
 * The public website's identity and its on/off switch.
 *
 * `GET /cms/public/site` and `/cms/public/pages/:slug` are unauthenticated —
 * they are the API a marketing site would render from. Before this setting
 * existed they were simply on, permanently, with no way for a hospital to
 * decide whether its content faced the open internet at all. `enabled` is that
 * decision, and it defaults to off: publishing to the public web is the kind
 * of thing an administrator should switch on deliberately.
 *
 * Every other field is content the public endpoint hands back, so nothing here
 * is decoration — a field that changed nothing would be a lie told in a form.
 */
export const frontCmsSettingSchema = z.object({
  /** Master switch for the public endpoints. Off means they 404. */
  enabled: z.boolean().default(false),

  siteName: z.string().max(120).default(''),
  tagline: z.string().max(200).default(''),
  logoUrl: z.string().max(500).default(''),
  faviconUrl: z.string().max(500).default(''),

  // Search engines and link previews.
  metaTitle: z.string().max(160).default(''),
  metaDescription: z.string().max(300).default(''),
  metaKeywords: z.string().max(300).default(''),

  contactAddress: z.string().max(400).default(''),
  contactPhone: z.string().max(40).default(''),
  contactEmail: z.string().max(160).default(''),

  facebookUrl: z.string().max(300).default(''),
  twitterUrl: z.string().max(300).default(''),
  instagramUrl: z.string().max(300).default(''),
  youtubeUrl: z.string().max(300).default(''),
  linkedinUrl: z.string().max(300).default(''),

  footerText: z.string().max(400).default(''),

  /**
   * A Google Analytics measurement id, if the hospital uses one.
   *
   * Validated in shape rather than accepted freely: this value is emitted into
   * the public page, so "whatever the admin pasted" is a script-injection
   * surface. `G-XXXXXXX` or `UA-XXXXX-Y`, or empty.
   */
  analyticsId: z
    .string()
    .max(40)
    .regex(/^$|^(G-[A-Z0-9]{4,20}|UA-\d{4,12}-\d{1,4})$/, 'Use a Google Analytics id like G-ABCD1234, or leave blank')
    .default(''),
});
export type FrontCmsSettingInput = z.infer<typeof frontCmsSettingSchema>;

/** What an unauthenticated caller gets when the site is switched on. */
export interface PublicSiteDto {
  enabled: true;
  site: {
    siteName: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    contactAddress: string;
    contactPhone: string;
    contactEmail: string;
    social: { facebook: string; twitter: string; instagram: string; youtube: string; linkedin: string };
    footerText: string;
    analyticsId: string;
  };
  menus: CmsMenuDto[];
  banners: CmsBannerDto[];
  pages: CmsPageDto[];
}

/**
 * The identity block, shaped for the public endpoint.
 *
 * `siteName` falls back to the hospital's own name rather than shipping an
 * empty string into a `<title>`: a hospital that switched the site on without
 * filling this in wants its name there, not a blank tab.
 */
export function publicSiteIdentity(
  s: FrontCmsSettingInput,
  hospitalName: string,
): PublicSiteDto['site'] {
  return {
    siteName: s.siteName || hospitalName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    metaTitle: s.metaTitle || s.siteName || hospitalName,
    metaDescription: s.metaDescription,
    metaKeywords: s.metaKeywords,
    contactAddress: s.contactAddress,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    social: {
      facebook: s.facebookUrl,
      twitter: s.twitterUrl,
      instagram: s.instagramUrl,
      youtube: s.youtubeUrl,
      linkedin: s.linkedinUrl,
    },
    footerText: s.footerText,
    analyticsId: s.analyticsId,
  };
}
