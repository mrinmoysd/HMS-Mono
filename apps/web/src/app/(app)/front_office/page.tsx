'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { PhoneCallDto, PostalComplaintDto, VisitorDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCatalog } from '@/lib/hooks/use-masters';
import {
  useVisitors, useCreateVisitor, usePhoneCalls, useCreatePhoneCall, useComplaints, useCreateComplaint,
} from '@/lib/hooks/use-office';
import { useAbility } from '@/lib/auth-store';

type Tab = 'visitors' | 'calls' | 'postal';

export default function FrontOfficePage() {
  const ability = useAbility();
  const canAdd = ability.can('front_office', 'add');
  const [tab, setTab] = useState<Tab>('visitors');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const visitors = useVisitors({ page, size: 25 });
  const calls = usePhoneCalls({ page, size: 25 });
  const complaints = useComplaints({ page, size: 25 });
  const purposes = useCatalog('front-office-purpose', { size: 100 });
  const complaintTypes = useCatalog('complaint-type', { size: 100 });
  const cVisitor = useCreateVisitor();
  const cCall = useCreatePhoneCall();
  const cComplaint = useCreateComplaint();

  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const visitorCols: Column<VisitorDto>[] = [
    { key: 'name', header: 'Name', className: 'font-medium' },
    { key: 'purposeName', header: 'Purpose', render: (v) => v.purposeName ?? '—' },
    { key: 'visitTo', header: 'Visit To', render: (v) => v.visitTo ?? '—' },
    { key: 'phone', header: 'Phone', render: (v) => v.phone ?? '—' },
    { key: 'date', header: 'Date', render: (v) => new Date(v.date).toLocaleDateString() },
  ];
  const callCols: Column<PhoneCallDto>[] = [
    { key: 'name', header: 'Name', className: 'font-medium' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
    { key: 'type', header: 'Type' },
    { key: 'date', header: 'Date', render: (c) => new Date(c.date).toLocaleDateString() },
    { key: 'note', header: 'Note', render: (c) => c.note ?? '—' },
  ];
  const complaintCols: Column<PostalComplaintDto>[] = [
    { key: 'description', header: 'Description', className: 'font-medium' },
    { key: 'complaintTypeName', header: 'Type', render: (c) => c.complaintTypeName ?? '—' },
    { key: 'source', header: 'Source', render: (c) => c.source ?? '—' },
    { key: 'date', header: 'Date', render: (c) => new Date(c.date).toLocaleDateString() },
  ];

  async function save() {
    if (tab === 'visitors') await cVisitor.mutateAsync({ name: f.name, purposeId: f.purposeId || null, visitTo: f.visitTo, phone: f.phone, date: new Date(f.date || today) });
    else if (tab === 'calls') await cCall.mutateAsync({ name: f.name, phone: f.phone, type: (f.type as 'incoming' | 'outgoing') || 'incoming', date: new Date(f.date || today), note: f.note });
    else await cComplaint.mutateAsync({ description: f.description, complaintTypeId: f.complaintTypeId || null, source: f.source, name: f.name, date: new Date(f.date || today) });
    setOpen(false); setF({});
  }

  const label = tab === 'visitors' ? 'Visitor' : tab === 'calls' ? 'Phone Call' : 'Postal / Complaint';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Front Office"
        description="Visitor register, phone log and postal complaints"
        actions={canAdd && <Button onClick={() => { setF({ date: today }); setOpen(true); }}><Plus className="h-4 w-4" /> Add {label}</Button>}
      />

      <Tabs tabs={[{ value: 'visitors', label: 'Visitors' }, { value: 'calls', label: 'Phone Call Log' }, { value: 'postal', label: 'Postal / Complaint' }]}
        value={tab} onChange={(t) => { setTab(t as Tab); setPage(1); }} />

      {tab === 'visitors' && <DataTable columns={visitorCols} rows={visitors.data?.data ?? []} meta={visitors.data?.meta} loading={visitors.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />}
      {tab === 'calls' && <DataTable columns={callCols} rows={calls.data?.data ?? []} meta={calls.data?.meta} loading={calls.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />}
      {tab === 'postal' && <DataTable columns={complaintCols} rows={complaints.data?.data ?? []} meta={complaints.data?.meta} loading={complaints.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />}

      <FormDrawer open={open} title={`Add ${label}`} onClose={() => setOpen(false)} onSubmit={save} submitting={cVisitor.isPending || cCall.isPending || cComplaint.isPending}>
        <div className="space-y-4">
          {tab !== 'postal' && <Field label="Name" required><TextInput value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>}
          {tab === 'visitors' && (
            <>
              <Field label="Purpose"><Select value={f.purposeId ?? ''} onChange={(e) => set('purposeId', e.target.value)} placeholder="Select…" options={(purposes.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }))} /></Field>
              <Field label="Visit To"><Select value={f.visitTo ?? ''} onChange={(e) => set('visitTo', e.target.value)} placeholder="Select…" options={['ipd', 'opd', 'staff'].map((v) => ({ value: v, label: v.toUpperCase() }))} /></Field>
            </>
          )}
          {tab === 'calls' && <Field label="Type"><Select value={f.type ?? 'incoming'} onChange={(e) => set('type', e.target.value)} options={['incoming', 'outgoing'].map((v) => ({ value: v, label: v }))} /></Field>}
          {tab === 'postal' && (
            <>
              <Field label="Description" required><TextArea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
              <Field label="Complaint Type"><Select value={f.complaintTypeId ?? ''} onChange={(e) => set('complaintTypeId', e.target.value)} placeholder="Select…" options={(complaintTypes.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} /></Field>
              <Field label="Source"><TextInput value={f.source ?? ''} onChange={(e) => set('source', e.target.value)} /></Field>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><TextInput value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Date"><TextInput type="date" value={f.date ?? today} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
