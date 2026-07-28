'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import type { RosterPeriodDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useDrShifts, useRosterPeriods, useCreateRosterPeriod, useDeleteRosterPeriod } from '@/lib/hooks/use-duty-roster';
import { fmtDate } from './util';

export function RosterView({ onBack }: { onBack: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('duty_roster', 'add');
  const canDelete = ability.can('duty_roster', 'delete');

  const shifts = useDrShifts();
  const list = useRosterPeriods();
  const create = useCreateRosterPeriod();
  const del = useDeleteRosterPeriod();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ shiftId: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const all = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((r) => r.shiftName.toLowerCase().includes(q)) : all;
  }, [list.data, search]);

  function openAdd() {
    setForm({ shiftId: '', startDate: '', endDate: '' });
    setError('');
    setOpen(true);
  }
  async function save() {
    if (!form.shiftId || !form.startDate || !form.endDate) { setError('Shift, start date and end date are required.'); return; }
    if (form.endDate < form.startDate) { setError('End date must be on or after start date.'); return; }
    await create.mutateAsync({ shiftId: form.shiftId, startDate: new Date(form.startDate), endDate: new Date(form.endDate) });
    setOpen(false);
  }
  async function remove(r: RosterPeriodDto) {
    const ok = await confirm({
      title: `Delete roster for ${r.shiftName}?`,
      description: 'Staff assignments inside this roster period will be removed too.',
      confirmLabel: 'Delete roster',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(r.id);
      toast.success(`Roster deleted`);
    } catch (e) {
      toast.error('Could not delete roster', { description: (e as Error).message });
    }
  }

  const cols: Column<RosterPeriodDto>[] = [
    { key: 'shiftName', header: 'Shift Name', className: 'font-medium' },
    { key: 'startDate', header: 'Start Date', render: (r) => fmtDate(r.startDate) },
    { key: 'endDate', header: 'End Date', render: (r) => fmtDate(r.endDate) },
    { key: 'startLabel', header: 'Shift Start', render: (r) => r.startLabel || '—' },
    { key: 'endLabel', header: 'Shift End', render: (r) => r.endLabel || '—' },
    { key: 'shiftHour', header: 'Shift Hour', render: (r) => r.shiftHour },
    { key: 'rosterDays', header: 'Roster Days', render: (r) => r.rosterDays },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Duty Roster</button>
      <PageHeader
        title="Roster List"
        actions={canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Roster</Button>}
      />

      <DataTable
        columns={cols}
        rows={rows}
        loading={list.isLoading}
        search={search}
        onSearch={setSearch}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'Roster List', filename: 'roster-list', headers: ['Shift Name', 'Start Date', 'End Date', 'Shift Start', 'Shift End', 'Shift Hour', 'Roster Days'], rows: rows.map((r) => [r.shiftName, fmtDate(r.startDate), fmtDate(r.endDate), r.startLabel, r.endLabel, r.shiftHour, r.rosterDays]) })} />}
        rowActions={canDelete ? (r) => (
          <button onClick={() => remove(r)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
        ) : undefined}
      />

      <FormDrawer open={open} title="Add Roster" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Field label="Shift Name" required>
            <Select value={form.shiftId} onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))} placeholder="Select"
              options={(shifts.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" required><TextInput type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
            <Field label="End Date" required><TextInput type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></Field>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
