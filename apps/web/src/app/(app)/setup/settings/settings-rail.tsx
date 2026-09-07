'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import type { SettingsNavItemDto } from '@smart-hospital/shared';
import { useSettingsOverview } from '@/lib/hooks/use-settings';
import { Skeleton } from '@/components/ui/skeleton';
import { baseInput } from '@/components/ui/input-chrome';

/**
 * The Settings rail — the reference's 20 entries in their 5 groups.
 *
 * Screens not built yet are shown greyed with a "Soon" chip rather than hidden.
 * The same call made for unimplemented providers and modules: an inventory that
 * tells the truth is more useful than a shorter list with silent gaps, and it
 * means an admin looking for SMS settings learns they are coming rather than
 * concluding the product cannot do it.
 *
 * Two presentations of one list. Below `md` the vertical rail is a native
 * `<select>`, because a 20-item nav stacked above the form pushed every
 * settings screen off the bottom of a phone — you scrolled past the whole menu
 * to reach the first field. A native picker also gets the platform's own wheel
 * on iOS and Android, which beats anything reimplemented here, and `optgroup`
 * keeps the five groups the rail already had.
 */
export function SettingsRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading } = useSettingsOverview();

  if (isLoading) {
    // Matches whichever presentation is about to render, so the layout does not
    // jump from a phone-sized bar to a desktop-sized column.
    return <Skeleton className="h-10 w-full md:h-96 md:w-56" />;
  }
  if (!data) return null;

  const groups = [...new Set(data.nav.map((n) => n.group))];
  const current = data.nav.find((n) => n.href === pathname);

  return (
    <>
      {/* Phone: a jump menu. */}
      <div className="md:hidden">
        {/*
          `aria-label` rather than a visually-hidden <label>: `sr-only` is not
          used anywhere else in this app and the Tailwind build has bitten us
          on unreferenced utilities before. This needs no CSS to be correct.
        */}
        <select
          aria-label="Go to a settings screen"
          className={`${baseInput} h-10`}
          value={current?.href ?? ''}
          onChange={(e) => {
            if (e.target.value) router.push(e.target.value);
          }}
        >
          {!current && <option value="">Settings…</option>}
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {data.nav
                .filter((n) => n.group === group)
                .map((item) => (
                  // Unbuilt screens stay visible and unselectable — the same
                  // thing the greyed row says on desktop.
                  <option key={item.key} value={item.href ?? ''} disabled={!item.href}>
                    {item.label}
                    {item.href ? '' : ' — Soon'}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <SecretsWarning show={!data.secretsConfigured} className="mt-3" />
      </div>

      {/* Desktop: the rail. */}
      <nav className="hidden w-56 shrink-0 space-y-4 rounded-md border border-border bg-surface p-3 md:block">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
              {group}
            </p>
            <ul className="space-y-0.5">
              {data.nav
                .filter((n) => n.group === group)
                .map((item) => (
                  <RailItem key={item.key} item={item} active={pathname === item.href} />
                ))}
            </ul>
          </div>
        ))}

        <SecretsWarning show={!data.secretsConfigured} />
      </nav>
    </>
  );
}

function RailItem({ item, active }: { item: SettingsNavItemDto; active: boolean }) {
  if (!item.href) {
    return (
      <li
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-fg-muted/50"
        title="Not built yet"
      >
        {item.label}
        <span className="ml-auto rounded-full bg-bg px-1.5 py-0.5 text-[10px]">Soon</span>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={item.href}
        className={`block rounded-sm px-2 py-1.5 text-sm ${
          active ? 'bg-primary/10 font-medium text-primary' : 'text-fg-muted hover:bg-bg hover:text-fg'
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

function SecretsWarning({ show, className = '' }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <div
      className={`flex items-start gap-1.5 rounded-sm border border-warning/40 bg-warning/10 p-2 text-[11px] ${className}`}
    >
      <Lock className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
      <span>
        Credential storage is off — <code>SETTINGS_ENCRYPTION_KEY</code> is not set on the API.
      </span>
    </div>
  );
}
