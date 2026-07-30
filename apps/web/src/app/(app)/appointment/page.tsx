'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Printer, Users, ListOrdered, Menu as MenuIcon, CalendarClock } from 'lucide-react';
import type { AppointmentDto, AppointmentTab } from '@smart-hospital/shared';
import type { SortState } from '@/components/ui/data-table';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
  const [sort, setSort] = useState<SortState | undefined>();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentDto | null>(null);

  const sortParam = sort ? `${sort.key}:${sort.dir}` : undefined;
  const { data, isLoading, error } = useAppointments(tab, { search, page, size, sort: sortParam });
  const setStatus = useSetAppointmentStatus();

  const columns: Column<AppointmentDto>[] = [
    {
      key: 'patientName', header: 'Patient Name', sortable: true,
      render: (a) => <Link href={opdHref(a)} className="font-medium text-primary hover:underline">{a.patientName}</Link>,
    },
    {
      key: 'apptNo', header: 'Appointment No', sortable: true,
      render: (a) => <Link href={opdHref(a)} className="text-primary hover:underline">{a.apptNo}</Link>,
    },
    { key: 'createdByName', header: 'Created By', render: (a) => a.createdByName ?? '—' },
    { key: 'apptDate', header: 'Appointment Date', sortable: true, render: (a) => new Date(a.apptDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) },
    { key: 'patientPhone', header: 'Phone', sortable: true, render: (a) => a.patientPhone ?? '—' },
    { key: 'patientGender', header: 'Gender', sortable: true, render: (a) => a.patientGender ?? '—' },
    { key: 'doctorName', header: 'Doctor', sortable: true },
    { key: 'source', header: 'Source', sortable: true, render: (a) => a.source ?? '—' },
    { key: 'priority', header: 'Priority', sortable: true, render: (a) => <span className="capitalize">{a.priority}</span> },
    { key: 'liveConsult', header: 'Live Consultant', sortable: true, render: (a) => (a.liveConsult ? 'Yes' : 'No') },
    { key: 'alternateAddress', header: 'Alternate Address', sortable: true, render: (a) => a.alternateAddress ?? '—' },
    { key: 'fees', header: 'Fees ($)', sortable: true, className: 'tabular', render: (a) => a.fees.toFixed(2) },
    { key: 'discountPct', header: 'Discount (%)', sortable: true, className: 'tabular', render: (a) => `${discountAmt(a).toFixed(2)} (${a.discountPct}%)` },
    { key: 'paid', header: 'Paid ($)', sortable: true, className: 'tabular', render: (a) => a.paid.toFixed(2) },
    {
      key: 'status', header: 'Status', sortable: true,
      // The reference shows a coloured pill. Editors additionally get a select
      // layered over it, so the status reads the same for everyone and stays
      // one click to change for those allowed to.
      render: (a) => canEdit ? (
        <span className="relative inline-flex items-center">
          <StatusPill status={a.status} />
          <select
            value={a.status}
            aria-label={`Status for ${a.patientName}`}
            onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {['pending', 'approved', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </span>
      ) : <StatusPill status={a.status} />,
    },
  ];

  /** asc → desc → cleared, so a third click restores the default ordering. */
  function toggleSort(key: string) {
    setSort((cur) =>
      cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : undefined,
    );
    setPage(1);
  }

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
      <PageHeader
        title="Appointments"
        description="Book, queue and track appointments per doctor"
        actions={
          <>
            <Link href="/appointment/doctor-wise" className="flex h-control items-center gap-1.5 rounded-sm border border-line px-3 text-sm transition hover:bg-surface-sunken"><Users className="h-4 w-4" /> Doctor Wise</Link>
            <Link href="/appointment/queue" className="flex h-control items-center gap-1.5 rounded-sm border border-line px-3 text-sm transition hover:bg-surface-sunken"><ListOrdered className="h-4 w-4" /> Queue</Link>
            {canAdd && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Appointment</Button>}
          </>
        }
      >
        <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1); }} />
      </PageHeader>

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
        sort={sort}
        onSort={toggleSort}
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

/**
 * Patient Name and Appointment No both open the patient's OPD record, per the
 * annotation on the reference screenshot ("should navigate to OPD details of
 * that patient") — not the Patient 360 page.
 */
function opdHref(a: AppointmentDto): string {
  return `/opd?tab=patientView&patientId=${a.patientId}&patientName=${encodeURIComponent(a.patientName)}`;
}

function discountAmt(a: AppointmentDto): number {
  return Math.round((a.fees * (a.discountPct / 100) + Number.EPSILON) * 100) / 100;
}
