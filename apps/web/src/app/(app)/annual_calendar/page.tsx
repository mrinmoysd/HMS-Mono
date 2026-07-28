'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { HOLIDAY_TYPES, holidaySchema, type HolidayDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useHolidays, useCreateHoliday } from '@/lib/hooks/use-hr';
import { useAbility } from '@/lib/auth-store';

const TYPE_TONE: Record<string, string> = {
  holiday: 'bg-danger/10 text-danger',
  activity: 'bg-primary/10 text-primary',
  vacation: 'bg-success/10 text-success',
};

export default function AnnualCalendarPage() {
  const ability = useAbility();
  const canAdd = ability.can('annual_calendar', 'add');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const holidays = useHolidays(typeFilter || undefined, { page, size: 25 });
  const create = useCreateHoliday();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('holiday');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState('');
  const [desc, setDesc] = useState('');
  const [frontSite, setFrontSite] = useState(false);

  const cols: Column<HolidayDto>[] = [
    { key: 'type', header: 'Type', render: (h) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_TONE[h.type] ?? ''}`}>{h.type}</span> },
    { key: 'title', header: 'Title', className: 'font-medium' },
    { key: 'fromDate', header: 'From', render: (h) => new Date(h.fromDate).toLocaleDateString() },
    { key: 'toDate', header: 'To', render: (h) => (h.toDate ? new Date(h.toDate).toLocaleDateString() : '—') },
    { key: 'frontSite', header: 'Front Site', render: (h) => (h.frontSite ? 'Yes' : 'No') },
  ];

  async function save() {
    const parsed = holidaySchema.safeParse({
      type, title, fromDate: from, toDate: to || undefined, description: desc, frontSite,
    });
    if (!parsed.success) return;
    await create.mutateAsync(parsed.data);
    setOpen(false); setTitle(''); setTo(''); setDesc(''); setFrontSite(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Annual Calendar</h1>
          <p className="text-sm text-fg-muted">Holidays, activities and vacations</p>
        </div>
        {canAdd && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Entry</Button>}
      </div>

      <DataTable columns={cols} rows={holidays.data?.data ?? []} meta={holidays.data?.meta} loading={holidays.isLoading}
        search="" onSearch={() => {}} onPage={setPage} onSize={() => {}}
        toolbar={
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-sm border border-border bg-surface px-2 py-1.5 text-sm">
            <option value="">All types</option>
            {HOLIDAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        } />

      <FormDrawer open={open} title="Add Calendar Entry" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        <div className="space-y-4">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}
              options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From Date" required><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To Date (optional)"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Field label="Description"><TextArea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={frontSite} onChange={(e) => setFrontSite(e.target.checked)} /> Show on public front site
          </label>
        </div>
      </FormDrawer>
    </div>
  );
}
