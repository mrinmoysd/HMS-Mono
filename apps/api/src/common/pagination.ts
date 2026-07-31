import type { ListMeta, ListQuery, Paginated } from '@smart-hospital/shared';

/**
 * Translate ListQuery → Prisma skip/take/orderBy.
 *
 * `sortable` is the whitelist of column names a caller may order by. It is
 * required in spirit even though the parameter is optional: without it `sort` is
 * ignored entirely rather than trusted.
 *
 * This used to interpolate `query.sort` straight into the orderBy object. Two
 * problems with that, both reproduced against the running API:
 *
 *   · `?sort=notAColumn:asc` reached Prisma, threw, and surfaced as a 500 —
 *     a client-triggerable server error on every list endpoint.
 *   · `?sort=branchId:asc` happily ordered by a column the DTO never exposes,
 *     letting a caller probe and order by internals.
 *
 * Passing an unknown or non-whitelisted field now falls back to the default
 * ordering, which is the behaviour a list endpoint should have: ignore the hint
 * it cannot honour rather than fail the request.
 *
 * `defaultOrderBy` is that fallback. It defaults to `createdAt: desc`, but not
 * every model has a `createdAt` — ItemIssue and ItemStock order by `date`
 * instead — and falling back to a column that does not exist turns a rejected
 * sort into a 500, which is the exact failure the whitelist exists to prevent.
 * Callers whose model lacks `createdAt` must pass their own.
 */
export function toPrismaPage(
  query: ListQuery,
  sortable?: readonly string[],
  defaultOrderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' },
): {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
} {
  const skip = (query.page - 1) * query.size;
  const take = query.size;
  let orderBy: Record<string, 'asc' | 'desc'> = defaultOrderBy;
  if (query.sort && sortable?.length) {
    const [field, dir] = query.sort.split(':');
    if (field && sortable.includes(field)) {
      orderBy = { [field]: dir === 'asc' ? 'asc' : 'desc' };
    }
  }
  return { skip, take, orderBy };
}

export function paginate<T>(data: T[], total: number, query: ListQuery): Paginated<T> {
  const meta: ListMeta = {
    page: query.page,
    size: query.size,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.size)),
  };
  return { data, meta };
}
