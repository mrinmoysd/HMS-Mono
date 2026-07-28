'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Hospital, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { MODULES, MODULE_META, SIDEBAR_GROUPS, type ModuleKey } from '@smart-hospital/shared';
import { useAbility } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { MODULE_ICONS, MODULE_SUBNAV, moduleHref } from './nav-config';

const RAIL_KEY = 'sh-sidebar-rail';

export function Sidebar({
  /** Mobile drawer state, owned by the app layout. */
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const ability = useAbility();
  const pathname = usePathname();
  const [rail, setRail] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRail(localStorage.getItem(RAIL_KEY) === '1');
  }, []);

  function toggleRail() {
    setRail((v) => {
      localStorage.setItem(RAIL_KEY, v ? '0' : '1');
      return !v;
    });
  }

  // Only modules the role can access, grouped per FRONTEND_DESIGN §3.1.
  const byGroup = useMemo(() => {
    const visible = MODULES.filter((m) => ability.canAccess(m));
    return SIDEBAR_GROUPS.map((group) => ({
      group,
      items: visible.filter((m) => MODULE_META[m].group === group),
    })).filter((g) => g.items.length > 0);
  }, [ability]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // A module with sub-nav auto-opens when one of its routes is active, so a
  // deep link (e.g. /setup/pharmacy) lands with its section already expanded.
  useEffect(() => {
    const owner = (Object.keys(MODULE_SUBNAV) as ModuleKey[]).find((m) => isActive(moduleHref(m)));
    if (owner) setExpanded((prev) => (prev.has(owner) ? prev : new Set(prev).add(owner)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-overlay bg-fg/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'flex h-screen shrink-0 flex-col border-r border-line bg-surface-1 transition-[width]',
          rail ? 'w-[var(--sidebar-rail-w)]' : 'w-[var(--sidebar-w)]',
          // Off-canvas below lg; the layout renders it inline from lg up.
          'fixed inset-y-0 left-0 z-overlay lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex h-[var(--header-h)] shrink-0 items-center gap-2.5 border-b border-line',
            rail ? 'justify-center px-0' : 'px-3',
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
            <Hospital className="h-4 w-4" />
          </span>
          {!rail && (
            <span className="truncate text-sm font-semibold tracking-tight">Smart Hospital</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {byGroup.map(({ group, items }) => (
            <div key={group} className="mb-3 last:mb-0">
              {rail ? (
                <div className="mx-2 mb-2 border-t border-line first:border-0" />
              ) : (
                <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {group}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const href = moduleHref(m);
                  const active = isActive(href);
                  const Icon = MODULE_ICONS[m];
                  const subnav = MODULE_SUBNAV[m];
                  const open = expanded.has(m) && !rail;

                  return (
                    <li key={m}>
                      <div className="relative flex items-center">
                        <Link
                          href={href}
                          onClick={onMobileClose}
                          title={rail ? MODULE_META[m].label : undefined}
                          className={cn(
                            'group flex min-w-0 flex-1 items-center gap-2.5 rounded-sm py-1.5 text-sm transition',
                            rail ? 'justify-center px-0' : 'px-2',
                            active
                              ? 'bg-primary-soft font-medium text-primary'
                              : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                          )}
                        >
                          {/* Left accent bar marks the active module at a glance. */}
                          {active && (
                            <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
                          )}
                          <Icon className="h-4 w-4 shrink-0" />
                          {!rail && <span className="truncate">{MODULE_META[m].label}</span>}
                        </Link>
                        {subnav && !rail && (
                          <button
                            type="button"
                            aria-label={open ? `Collapse ${MODULE_META[m].label}` : `Expand ${MODULE_META[m].label}`}
                            aria-expanded={open}
                            onClick={() =>
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(m)) next.delete(m);
                                else next.add(m);
                                return next;
                              })
                            }
                            className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
                          >
                            <ChevronDown
                              className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
                            />
                          </button>
                        )}
                      </div>

                      {subnav && open && (
                        <ul className="ml-[1.4rem] mt-0.5 space-y-0.5 border-l border-line pl-2">
                          {subnav.map((s) => {
                            // Exact match: /setup must not light up on /setup/beds.
                            const subActive = pathname === s.href;
                            return (
                              <li key={s.href}>
                                <Link
                                  href={s.href}
                                  onClick={onMobileClose}
                                  className={cn(
                                    'block truncate rounded-sm px-2 py-1 text-xs transition',
                                    subActive
                                      ? 'font-medium text-primary'
                                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                                  )}
                                >
                                  {s.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-2">
          <button
            type="button"
            onClick={toggleRail}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-sm py-1.5 text-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg',
              rail ? 'justify-center px-0' : 'px-2',
            )}
          >
            {rail ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!rail && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
