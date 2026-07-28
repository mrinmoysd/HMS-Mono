'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Users, CalendarCheck, BedDouble, Receipt } from 'lucide-react';
import { useAuthStore, useAbility } from '@/lib/auth-store';
import { MODULES } from '@smart-hospital/shared';

const KPIS = [
  { label: 'Patients', value: '—', icon: Users, tint: 'text-primary' },
  { label: "Today's Appointments", value: '—', icon: CalendarCheck, tint: 'text-accent' },
  { label: 'Occupied Beds', value: '—', icon: BedDouble, tint: 'text-occupied' },
  { label: "Today's Collection", value: '—', icon: Receipt, tint: 'text-success' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const ability = useAbility();
  const accessible = MODULES.filter((m) => ability.canAccess(m));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Welcome back, {user?.name} · signed in as{' '}
            <span className="font-medium">{user?.roleLabel}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-fg-muted">{label}</p>
              <Icon className={`h-5 w-5 ${tint}`} />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Your access</h2>
        <p className="mb-3 text-sm text-fg-muted">
          Role-based navigation — {accessible.length} of {MODULES.length} modules visible to your
          role.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {accessible.map((m) => (
            <span
              key={m}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
