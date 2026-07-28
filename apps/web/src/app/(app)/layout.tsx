'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from '@/components/app-shell/sidebar';
import { HeaderBar } from '@/components/app-shell/header-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [navOpen, setNavOpen] = useState(false);

  // Auth guard — wait until the persisted store has rehydrated before deciding,
  // otherwise a full page load would bounce an authenticated user to /login.
  useEffect(() => {
    if (hasHydrated && !user) router.replace('/login');
  }, [hasHydrated, user, router]);

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={navOpen} onMobileClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <HeaderBar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-page">{children}</main>
      </div>
    </div>
  );
}
