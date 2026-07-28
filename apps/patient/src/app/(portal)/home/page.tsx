'use client';

import Link from 'next/link';
import { CalendarDays, Receipt, FileText, ChevronRight } from 'lucide-react';
import { useProfile, useAppointments, useInvoices } from '@/lib/hooks';

export default function HomePage() {
  const profile = useProfile();
  const appts = useAppointments();
  const invoices = useInvoices();

  const upcoming = (appts.data ?? []).filter((a) => new Date(a.apptDate) >= new Date(new Date().toDateString()))[0];
  const dueTotal = (invoices.data ?? []).reduce((s, i) => s + i.balance, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary p-5 text-primary-fg">
        <p className="text-sm opacity-80">Welcome back</p>
        <p className="text-xl font-semibold">{profile.data?.name ?? '…'}</p>
        <p className="mt-1 text-xs opacity-80">Patient No. {profile.data?.patientNo ?? '—'}</p>
      </div>

      {upcoming ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Next Appointment</p>
          <p className="font-medium">{upcoming.doctorName}</p>
          <p className="text-sm text-fg-muted">{new Date(upcoming.apptDate).toLocaleDateString()} · <span className="capitalize">{upcoming.status}</span></p>
        </div>
      ) : (
        <Link href="/appointments" className="flex items-center justify-between rounded-xl border border-dashed border-border bg-surface p-4 text-sm">
          <span>No upcoming appointments — book one</span><ChevronRight className="h-4 w-4 text-fg-muted" />
        </Link>
      )}

      {dueTotal > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm text-warning">You have <b>{dueTotal.toFixed(2)}</b> in outstanding bills.</p>
          <Link href="/billing" className="mt-1 inline-block text-sm font-medium text-primary">Pay now →</Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/appointments', label: 'Book', icon: CalendarDays },
          { href: '/records', label: 'Records', icon: FileText },
          { href: '/billing', label: 'Bills', icon: Receipt },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4">
            <Icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
