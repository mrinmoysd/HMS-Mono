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
