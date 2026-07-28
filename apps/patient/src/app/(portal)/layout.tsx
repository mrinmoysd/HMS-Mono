'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, FileText, Receipt, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/appointments', label: 'Appts', icon: CalendarDays },
  { href: '/records', label: 'Records', icon: FileText },
  { href: '/billing', label: 'Bills', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (hasHydrated && !user) router.replace('/login');
  }, [hasHydrated, user, router]);

  if (!hasHydrated || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div>
          <p className="text-sm font-semibold leading-tight">Smart Hospital</p>
          <p className="text-[11px] leading-tight text-fg-muted">Hi, {user.name}</p>
        </div>
        <button onClick={() => { clear(); router.replace('/login'); }} aria-label="Log out" className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t border-border bg-surface py-1.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={cn('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium', active ? 'text-primary' : 'text-fg-muted')}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
