'use client';

import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import type { NoticeRow } from '@smart-hospital/shared';

/**
 * Notice board strip.
 *
 * Notices are the one dashboard widget with no permission gate — they are
 * broadcast to all staff by design (see DASHBOARD_WIDGETS), so this sits above
 * the KPI row where everyone sees it regardless of role.
 */
export function NoticesBanner({ notices }: { notices: NoticeRow[] }) {
  if (notices.length === 0) return null;

  return (
    <div className="rounded-md border border-info/25 bg-info/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-info">Notice board</p>
          <ul className="mt-1 space-y-0.5">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{n.title}</span>
                {n.noticeDate && (
                  <span className="text-xs text-fg-muted">
                    {new Date(n.noticeDate).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/messaging"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          All notices
        </Link>
      </div>
    </div>
  );
}
