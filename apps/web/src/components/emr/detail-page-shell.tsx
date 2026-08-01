'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The two-pane detail layout the reference uses for OPD Visit Detail and IPD
 * Patient Detail (blueprint §7.3, §8.3, rule #12).
 *
 * The left rail is a *switcher*, not a list: it holds the patients currently
 * in this ward or clinic so a doctor can move between them without going back
 * to the list and searching again. That is the whole point of the pattern —
 * on a round you are looking at fifteen patients in sequence.
 *
 * Generic over the module: OPD passes today's visits, IPD passes the admitted
 * patients, and each supplies its own chip subtitle (OPD shows the patient id,
 * IPD shows the bed).
 */
export interface RailItem {
  id: string;
  encounterNo: string;
  patientName: string;
  /** Second line on the chip — patient id for OPD, bed for IPD. */
  subtitle: string | null;
}

export function DetailPageShell({
  railTitle,
  items,
  loading,
  activeId,
  hrefFor,
  searchPlaceholder,
  breadcrumb,
  children,
}: {
  railTitle: string;
  items: RailItem[];
  loading?: boolean;
  activeId: string;
  hrefFor: (item: RailItem) => string;
  searchPlaceholder: string;
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState('');

  // Filtered in the browser: the rail holds one ward's worth of patients, so a
  // round-trip per keystroke would be slower and no more accurate.
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter(
        (i) =>
          i.patientName.toLowerCase().includes(needle) ||
          i.encounterNo.toLowerCase().includes(needle) ||
          (i.subtitle ?? '').toLowerCase().includes(needle),
      )
    : items;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-md border border-border bg-surface">
        <div className="border-b border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {railTitle} <span className="text-fg">({items.length})</span>
          </p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-sm border border-border bg-bg py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-fg-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && shown.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-fg-muted">
              {items.length === 0 ? 'Nobody here right now' : 'No match'}
            </p>
          )}
          {shown.map((i) => (
            <Link
              key={i.id}
              href={hrefFor(i)}
              aria-current={i.id === activeId ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition last:border-0',
                i.id === activeId ? 'bg-primary-soft' : 'hover:bg-surface-sunken',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xs font-semibold text-primary">
                {initials(i.patientName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.patientName}</span>
                {i.subtitle && <span className="block truncate text-xs text-fg-muted">{i.subtitle}</span>}
              </span>
              <span className="shrink-0 rounded-sm bg-surface-sunken px-1.5 py-0.5 text-2xs font-medium text-fg-muted">
                {i.encounterNo}
              </span>
            </Link>
          ))}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        {breadcrumb && <div className="text-sm text-fg-muted">{breadcrumb}</div>}
        {children}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
