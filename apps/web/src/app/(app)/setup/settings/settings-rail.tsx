'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useSettingsOverview } from '@/lib/hooks/use-settings';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The Settings rail — the reference's 20 entries in their 5 groups.
 *
 * Screens not built yet are shown greyed with a "Soon" chip rather than hidden.
 * The same call made for unimplemented providers and modules: an inventory that
 * tells the truth is more useful than a shorter list with silent gaps, and it
 * means an admin looking for SMS settings learns they are coming rather than
 * concluding the product cannot do it.
 */
export function SettingsRail() {
  const pathname = usePathname();
  const { data, isLoading } = useSettingsOverview();

  if (isLoading) return <Skeleton className="h-96 w-56" />;
  if (!data) return null;

  const groups = [...new Set(data.nav.map((n) => n.group))];

  return (
    <nav className="w-56 shrink-0 space-y-4 rounded-md border border-border bg-surface p-3">
      {groups.map((group) => (
        <div key={group}>
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
            {group}
          </p>
          <ul className="space-y-0.5">
            {data.nav
              .filter((n) => n.group === group)
              .map((item) =>
                item.href ? (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`block rounded-sm px-2 py-1.5 text-sm ${
                        pathname === item.href
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-fg-muted hover:bg-bg hover:text-fg'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li
                    key={item.key}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-fg-muted/50"
                    title="Not built yet"
                  >
                    {item.label}
                    <span className="ml-auto rounded-full bg-bg px-1.5 py-0.5 text-[10px]">Soon</span>
                  </li>
                ),
              )}
          </ul>
        </div>
      ))}

      {!data.secretsConfigured && (
        <div className="flex items-start gap-1.5 rounded-sm border border-warning/40 bg-warning/10 p-2 text-[11px]">
          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
          <span>
            Credential storage is off — <code>SETTINGS_ENCRYPTION_KEY</code> is not set on the API.
          </span>
        </div>
      )}
    </nav>
  );
}
