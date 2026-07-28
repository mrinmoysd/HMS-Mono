'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Printer, Users, ListOrdered, Menu as MenuIcon, CalendarClock } from 'lucide-react';
import type { AppointmentDto, AppointmentTab } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { AppointmentForm, printAppointmentSlip } from './appointment-form';
import { AppointmentDetailsModal } from './appointment-details-modal';
import { RescheduleModal } from './reschedule-modal';
import { useAppointments, useSetAppointmentStatus } from '@/lib/hooks/use-clinical';
import { useAbility } from '@/lib/auth-store';

const TABS: { value: AppointmentTab; label: string }[] = [
  { value: 'today', label: 'Today Appointment' },
  { value: 'upcoming', label: 'Upcoming Appointment' },
  { value: 'old', label: 'Old Appointment' },
];

export default function AppointmentPage() {
  const ability = useAbility();
  const canAdd = ability.can('appointment', 'add');
  const canEdit = ability.can('appointment', 'edit');

  const [tab, setTab] = useState<AppointmentTab>('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentDto | null>(null);

  const { data, isLoading, error } = useAppointments(tab, { search, page, size });
  const setStatus = useSetAppointmentStatus();

  const columns: Column<AppointmentDto>[] = [
    {
      key: 'patientName', header: 'Patient Name',
      render: (a) => <Link href={`/patient/${a.patientId}`} className="font-medium text-primary hover:underline">{a.patientName}</Link>,
    },
    {
      key: 'apptNo', header: 'Appointment No',
      render: (a) => <Link href={`/patient/${a.patientId}`} className="text-primary hover:underline">{a.apptNo}</Link>,
    },
    { key: 'createdByName', header: 'Created By', render: (a) => a.createdByName ?? '—' },
    { key: 'apptDate', header: 'Appointment Date', render: (a) => new Date(a.apptDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) },
    { key: 'patientPhone', header: 'Phone', render: (a) => a.patientPhone ?? '—' },
    { key: 'patientGender', header: 'Gender', render: (a) => a.patientGender ?? '—' },
    { key: 'doctorName', header: 'Doctor' },
    { key: 'source', header: 'Source', render: (a) => a.source ?? '—' },
    { key: 'priority', header: 'Priority' },
    { key: 'liveConsult', header: 'Live Consultant', render: (a) => (a.liveConsult ? 'Yes' : 'No') },
    { key: 'alternateAddress', header: 'Alternate Address', render: (a) => a.alternateAddress ?? '—' },
    { key: 'fees', header: 'Fees', className: 'tabular', render: (a) => a.fees.toFixed(2) },
    { key: 'discountPct', header: 'Discount (%)', className: 'tabular', render: (a) => `${discountAmt(a).toFixed(2)} (${a.discountPct}%)` },
    { key: 'paid', header: 'Paid', className: 'tabular', render: (a) => a.paid.toFixed(2) },
    {
      key: 'status', header: 'Status',
      render: (a) => canEdit ? (
        <select value={a.status} onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value })} className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs">
          {['pending', 'approved', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : <StatusPill status={a.status} />,
    },
  ];

  function exportTable(): ExportTable {
    const rows = data?.data ?? [];
    return {
      title: 'Appointments',
      filename: 'appointments',
      headers: ['Patient', 'Appt No', 'Created By', 'Date', 'Phone', 'Gender', 'Doctor', 'Source', 'Priority', 'Live', 'Fees', 'Discount %', 'Paid', 'Status'],
      rows: rows.map((a) => [a.patientName, a.apptNo, a.createdByName ?? '', new Date(a.apptDate).toLocaleString(), a.patientPhone ?? '', a.patientGender ?? '', a.doctorName, a.source ?? '', a.priority, a.liveConsult ? 'Yes' : 'No', a.fees.toFixed(2), `${a.discountPct}%`, a.paid.toFixed(2), a.status]),
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-fg-muted">Book, queue and track appointments per doctor</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/appointment/doctor-wise" className="flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm hover:bg-border/40"><Users className="h-4 w-4" /> Doctor Wise</Link>
          <Link href="/appointment/queue" className="flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm hover:bg-border/40"><ListOrdered className="h-4 w-4" /> Queue</Link>
          {canAdd && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Appointment</Button>}
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1); }} />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        error={error ? 'Failed to load appointments' : undefined}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={<ExportMenu table={exportTable} />}
        rowActions={(a) => (
          <>
            <button onClick={() => setDetailId(a.id)} aria-label="Details" title="Details" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
              <MenuIcon className="h-4 w-4" />
            </button>
            <button onClick={() => printAppointmentSlip(a)} aria-label="Print slip" title="Print slip" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50">
              <Printer className="h-4 w-4" />
            </button>
            {canEdit && (
              <button onClick={() => setRescheduleAppt(a)} aria-label="Reschedule" title="Reschedule" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <CalendarClock className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      <AppointmentForm open={open} onClose={() => setOpen(false)} />
      <AppointmentDetailsModal id={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
      <RescheduleModal appt={rescheduleAppt} open={!!rescheduleAppt} onClose={() => setRescheduleAppt(null)} />
    </div>
  );
}

function discountAmt(a: AppointmentDto): number {
  return Math.round((a.fees * (a.discountPct / 100) + Number.EPSILON) * 100) / 100;
}
