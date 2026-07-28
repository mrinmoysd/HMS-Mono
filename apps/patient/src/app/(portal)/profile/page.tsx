'use client';

import { useProfile } from '@/lib/hooks';

export default function ProfilePage() {
  const profile = useProfile();
  const p = profile.data;
  const rows: [string, string][] = p
    ? [
        ['Patient No', p.patientNo],
        ['Name', p.name],
        ['Age', p.age],
        ['Gender', p.gender ?? '—'],
        ['Phone', p.phone ?? '—'],
        ['Email', p.email ?? '—'],
        ['Blood Group', p.bloodGroup ?? '—'],
        ['Address', p.address ?? '—'],
      ]
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">My Profile</h1>
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
          {p?.name?.charAt(0) ?? '?'}
        </div>
        <p className="mt-3 font-semibold">{p?.name ?? '…'}</p>
        <p className="text-sm text-fg-muted">{p?.patientNo}</p>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-fg-muted">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
