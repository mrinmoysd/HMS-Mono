import type { ListMeta, ListQuery, Paginated } from '@smart-hospital/shared';

/** Translate ListQuery → Prisma skip/take/orderBy. */
export function toPrismaPage(query: ListQuery): {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
} {
  const skip = (query.page - 1) * query.size;
  const take = query.size;
  let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
  if (query.sort) {
    const [field, dir] = query.sort.split(':');
    if (field) orderBy = { [field]: dir === 'asc' ? 'asc' : 'desc' };
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
