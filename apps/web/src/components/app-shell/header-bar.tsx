'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BedDouble,
  CalendarDays,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Moon,
  Palette,
  Search,
  Sun,
} from 'lucide-react';
import { useAuthStore, useAbility } from '@/lib/auth-store';
import { BedGrid } from '@/components/bed-grid';
import { Menu, MenuItem } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { THEMES, useTheme } from './theme-provider';

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Icon-only header control. Renders as a link when `href` is given. */
function HeaderAction({
  label,
  icon: Icon,
  href,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    'flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg';
  const content = <Icon className="h-[18px] w-[18px]" />;
  return href ? (
    <Link href={href} aria-label={label} title={label} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {content}
    </button>
  );
}

export function HeaderBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const ability = useAbility();
  const { theme, setTheme, density, setDensity, mode, toggleMode } = useTheme();
  const [q, setQ] = useState('');
  const [bedOpen, setBedOpen] = useState(false);

  function logout() {
    clear();
    router.replace('/login');
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/patient?search=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex h-[var(--header-h)] shrink-0 items-center gap-2 border-b border-line bg-surface-1 px-3">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg lg:hidden"
      >
        <MenuIcon className="h-[18px] w-[18px]" />
      </button>

      {/* Global patient search (FRD §2.30) */}
      <form onSubmit={onSearch} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by patient name…"
          aria-label="Search patients"
          className="h-8 w-full rounded-sm border border-line bg-surface-sunken pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface-1 focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-0.5">
        {ability.can('ipd', 'view') && (
          <HeaderAction label="Bed status" icon={BedDouble} onClick={() => setBedOpen(true)} />
        )}
        {ability.canAccess('messaging') && (
          <HeaderAction label="Messaging" icon={MessageSquare} href="/messaging" />
        )}
        {ability.canAccess('annual_calendar') && (
          <HeaderAction label="Annual calendar" icon={CalendarDays} href="/annual_calendar" />
        )}

        <HeaderAction
          label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          icon={mode === 'dark' ? Sun : Moon}
          onClick={toggleMode}
        />

        {/* Appearance: palette + density. Custom panel content, not MenuItems,
            because these controls must not close the menu when used. */}
        <Menu
          trigger={
            <span
              title="Appearance"
              className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
            >
              <Palette className="h-[18px] w-[18px]" />
            </span>
          }
        >
          <div className="w-56 space-y-3 p-3">
            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                Palette
              </p>
              <SegmentedControl
                options={THEMES}
                value={theme}
                onChange={setTheme}
                size="sm"
                fullWidth
              />
            </div>
            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                Density
              </p>
              <SegmentedControl
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'comfortable', label: 'Comfortable' },
                ]}
                value={density}
                onChange={setDensity}
                size="sm"
                fullWidth
              />
            </div>
          </div>
        </Menu>

        <div className="ml-1.5 border-l border-line pl-1.5">
          <Menu
            trigger={
              <span className="flex items-center gap-2 rounded-sm py-1 pl-1 pr-1.5 transition hover:bg-surface-sunken">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xs font-semibold text-primary">
                  {initials(user?.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium leading-tight">{user?.name}</span>
                  <span className="block text-2xs leading-tight text-fg-muted">
                    {user?.roleLabel}
                  </span>
                </span>
              </span>
            }
          >
            <div className="border-b border-line px-3 py-2 sm:hidden">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-fg-muted">{user?.roleLabel}</p>
            </div>
            <MenuItem icon={LogOut} tone="danger" onClick={logout}>
              Log out
            </MenuItem>
          </Menu>
        </div>
      </div>

      <BedGrid open={bedOpen} onClose={() => setBedOpen(false)} />
    </header>
  );
}
