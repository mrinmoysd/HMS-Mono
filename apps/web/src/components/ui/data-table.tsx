'use client';

import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowDown,
  ArrowUp,
  Columns3,
  Search,
} from 'lucide-react';
import type { ListMeta } from '@smart-hospital/shared';
import { cn } from '@/lib/utils';
import { Checkbox } from './checkbox';
import { EmptyState } from './empty-state';
import { Menu } from './menu';
import { Select } from './field';
import { SkeletonTable } from './skeleton';

/**
 * The list surface used by 46 files.
 *
 * Every prop that existed before keeps its exact meaning; the new capabilities
 * (sorting, sticky header, column chooser, density, custom empty state) are all
 * optional, so no existing caller needs to change. See UI_SYSTEM_PLAN.md §5.2.
 */

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Marks the column sortable — requires `sort`/`onSort` on the table. */
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Excluded from the column chooser, e.g. an identifier column. */
  alwaysVisible?: boolean;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  meta?: ListMeta;
  loading?: boolean;
  error?: string;
  search: string;
  onSearch: (v: string) => void;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  // selection
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  // per-row action cluster
  rowActions?: (row: T) => React.ReactNode;
  // toolbar extras (Add button, export menu, etc.)
  toolbar?: React.ReactNode;

  /* ── additions, all optional ── */
  /** Controlled sort state; pair with `onSort`. */
  sort?: SortState;
  onSort?: (key: string) => void;
  /** Keeps the header visible while the body scrolls. */
  stickyHeader?: boolean;
  /** Show a per-table column visibility menu. */
  columnChooser?: boolean;
  /** Replaces the default "No records found" block. */
  emptyState?: React.ReactNode;
  /** Hide the built-in search box when the page supplies its own filters. */
  hideSearch?: boolean;
  /** Row click handler — the row gains a pointer cursor when set. */
  onRowClick?: (row: T) => void;
  className?: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  meta,
  loading,
  error,
  search,
  onSearch,
  onPage,
  onSize,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  rowActions,
  toolbar,
  sort,
  onSort,
  stickyHeader,
  columnChooser,
  emptyState,
  hideSearch,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden.has(c.key)),
    [columns, hidden],
  );

  const selectedOnPage = rows.filter((r) => selected?.has(r.id)).length;
  const allChecked = rows.length > 0 && selectedOnPage === rows.length;
  const colCount = visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  // Demo-parity range label: "Records: 1 to 10 of 42".
  const rangeLabel = meta
    ? `Records: ${meta.total === 0 ? 0 : (meta.page - 1) * meta.size + 1} to ${Math.min(meta.page * meta.size, meta.total)} of ${meta.total}`
    : '';

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface-1 shadow-sm', className)}>
      {(!hideSearch || toolbar || columnChooser) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          {!hideSearch && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search…"
                aria-label="Search"
                className="w-full rounded-sm border border-line bg-surface-sunken py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface-1 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {columnChooser && (
              <Menu
                trigger={
                  <span
                    className="flex h-8 items-center gap-1.5 rounded-sm border border-line px-2.5 text-xs font-medium text-fg-muted transition hover:bg-surface-sunken"
                    title="Columns"
                  >
                    <Columns3 className="h-4 w-4" /> Columns
                  </span>
                }
              >
                <div className="min-w-[12rem] p-1">
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className={cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                        c.alwaysVisible ? 'opacity-50' : 'cursor-pointer hover:bg-surface-sunken',
                      )}
                    >
                      <Checkbox
                        checked={!hidden.has(c.key)}
                        disabled={c.alwaysVisible}
                        onChange={() =>
                          setHidden((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key);
                            else next.add(c.key);
                            return next;
                          })
                        }
                      />
                      {c.header}
                    </label>
                  ))}
                </div>
              </Menu>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className={cn(
                'border-b border-line bg-surface-sunken text-left text-xs text-fg-muted',
                stickyHeader && 'sticky top-0 z-sticky',
              )}
            >
              {selectable && (
                <th className="w-10 px-cell py-cell">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={selectedOnPage > 0 && !allChecked}
                    onChange={() => onToggleAll?.(rows.map((r) => r.id))}
                    aria-label="Select all"
                  />
                </th>
              )}
              {visibleColumns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable && onSort;
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('px-cell py-cell font-semibold', ALIGN[c.align ?? 'left'], c.className)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1 transition hover:text-fg',
                          active && 'text-fg',
                        )}
                      >
                        {c.header}
                        {!active && <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                        {active && sort.dir === 'asc' && <ArrowUp className="h-3 w-3" />}
                        {active && sort.dir === 'desc' && <ArrowDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th className="px-cell py-cell text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} className="p-0">
                  <SkeletonTable rows={5} columns={Math.max(colCount, 3)} />
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={colCount} className="px-cell py-10 text-center text-danger">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="p-0">
                  {emptyState ?? (
                    <EmptyState
                      title="No records found"
                      description="Try adjusting your search or filters."
                      compact
                    />
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-line/60 transition last:border-0 hover:bg-surface-sunken/60',
                    selected?.has(row.id) && 'bg-primary-soft/50',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {selectable && (
                    <td className="px-cell py-cell" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected?.has(row.id) ?? false}
                        onChange={() => onToggle?.(row.id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {visibleColumns.map((c) => (
                    <td
                      key={c.key}
                      className={cn('px-cell py-cell', ALIGN[c.align ?? 'left'], c.className)}
                    >
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-cell py-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(meta.size)}
              onChange={(e) => onSize(Number(e.target.value))}
              aria-label="Rows per page"
              options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
              className="w-20 py-1"
            />
            <span className="tabular">· {rangeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              disabled={meta.page <= 1}
              onClick={() => onPage(meta.page - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-line transition hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPage(meta.page + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-line transition hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
