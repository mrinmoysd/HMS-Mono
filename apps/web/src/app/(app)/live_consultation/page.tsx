'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Plus, Video } from 'lucide-react';
import type { LiveConsultationDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useLive, useCreateLive } from '@/lib/hooks/use-office';
import { useAbility } from '@/lib/auth-store';

type Tab = 'consultation' | 'meeting';

export default function LiveConsultationPage() {
  const ability = useAbility();
  const canAdd = ability.can('live_consultation', 'add');
  const [tab, setTab] = useState<Tab>('consultation');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const live = useLive(tab, { page, size: 25 });
  const create = useCreateLive();
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const cols: Column<LiveConsultationDto>[] = [
    { key: 'title', header: 'Title', className: 'font-medium' },
    { key: 'date', header: 'Date', render: (l) => new Date(l.date).toLocaleDateString() },
    ...(tab === 'meeting' ? [{ key: 'durationMin', header: 'Duration', render: (l: LiveConsultationDto) => (l.durationMin ? `${l.durationMin} min` : '—') }] : [{ key: 'createdFor', header: 'For', render: (l: LiveConsultationDto) => l.createdFor ?? '—' }]),
    { key: 'apiUsed', header: 'API', render: (l) => l.apiUsed ?? '—' },
    { key: 'status', header: 'Status', render: (l) => <StatusPill status={l.status === 'scheduled' ? 'pending' : l.status} /> },
  ];

  async function save() {
    await create.mutateAsync({ kind: tab, title: f.title, description: f.description, date: new Date(f.date || today), durationMin: f.durationMin ? Number(f.durationMin) : undefined, apiUsed: f.apiUsed || 'Zoom', createdFor: f.createdFor });
    setOpen(false); setF({});
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Consultation"
        description="Zoom-based tele-consultations and meetings"
        actions={canAdd && <Button onClick={() => { setF({ date: today, apiUsed: 'Zoom' }); setOpen(true); }}><Plus className="h-4 w-4" /> Schedule {tab === 'meeting' ? 'Meeting' : 'Consultation'}</Button>}
      />

      <Tabs tabs={[{ value: 'consultation', label: 'Consultations' }, { value: 'meeting', label: 'Meetings' }]} value={tab} onChange={(t) => { setTab(t as Tab); setPage(1); }} />

      <DataTable columns={cols} rows={live.data?.data ?? []} meta={live.data?.meta} loading={live.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />

      <FormDrawer open={open} title={`Schedule ${tab === 'meeting' ? 'Meeting' : 'Consultation'}`} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        <div className="space-y-4">
          <Field label="Title" required><TextInput value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Description"><TextArea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required><TextInput type="date" value={f.date ?? today} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="API"><Select value={f.apiUsed ?? 'Zoom'} onChange={(e) => set('apiUsed', e.target.value)} options={['Zoom', 'Jitsi', 'Google Meet'].map((a) => ({ value: a, label: a }))} /></Field>
          </div>
          {tab === 'meeting'
            ? <Field label="Duration (minutes)"><TextInput type="number" value={f.durationMin ?? ''} onChange={(e) => set('durationMin', e.target.value)} /></Field>
            : <Field label="Created For"><TextInput value={f.createdFor ?? ''} onChange={(e) => set('createdFor', e.target.value)} placeholder="Patient / staff" /></Field>}
        </div>
      </FormDrawer>
    </div>
  );
}
