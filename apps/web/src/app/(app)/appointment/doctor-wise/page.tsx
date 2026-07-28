'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { DoctorWiseRow } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportTable } from '@/lib/export';
import { useDoctors } from '@/lib/hooks/use-clinical';
import { useDoctorWise } from '@/lib/hooks/use-appointment';

export default function DoctorWisePage() {
  const { data: doctors = [] } = useDoctors();
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [searched, setSearched] = useState('');
  const [searchedDate, setSearchedDate] = useState('');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useDoctorWise(searched, searchedDate, !!searched);
  const filtered = rows.filter((r) => !search || r.patientName.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<DoctorWiseRow>[] = [
    { key: 'patientName', header: 'Patient Name', render: (r) => <Link href={`/patient/${r.patientId}`} className="font-medium text-primary hover:underline">{r.patientName}</Link> },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
    { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'time', header: 'Time', render: (r) => new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { key: 'source', header: 'Source', render: (r) => r.source ?? '—' },
  ];

  function exportTable(): ExportTable {
    return {
      title: 'Doctor Wise Appointments', filename: 'doctor-wise-appointments',
      headers: ['Patient', 'Phone', 'Email', 'Date', 'Time', 'Source'],
      rows: filtered.map((r) => [r.patientName, r.phone ?? '', r.email ?? '', new Date(r.date).toLocaleDateString(), new Date(r.date).toLocaleTimeString(), r.source ?? '']),
    };
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Doctor Wise Appointment" backHref="/appointment" backLabel="Back to Appointments" />

      <div className="rounded-md border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
          <Field label="Doctor" required>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Select…" options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Button size="sm" disabled={!doctorId} onClick={() => { setSearched(doctorId); setSearchedDate(date); }}><Search className="h-4 w-4" /> Search</Button>
        </div>
      </div>

      {searched && (
        <DataTable columns={columns} rows={filtered} loading={isLoading}
          search={search} onSearch={setSearch} onPage={() => {}} onSize={() => {}}
          toolbar={<ExportMenu table={exportTable} />} />
      )}
    </div>
  );
}
