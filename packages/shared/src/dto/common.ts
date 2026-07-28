import { z } from 'zod';

/** Universal list-query contract shared by every list endpoint (FRD §2.29). */
export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(1000).default(25),
  sort: z.string().optional(), // e.g. "createdAt:desc"
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export interface ListMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: ListMeta;
}

/** Typed API error envelope returned by the global exception filter. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
