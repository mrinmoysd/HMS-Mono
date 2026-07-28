'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DutyShiftDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useDrShifts, useCreateDrShift, useUpdateDrShift, useDeleteDrShift } from '@/lib/hooks/use-duty-roster';

export function ShiftView({ onBack }: { onBack: () => void }) {
  const ability = useAbility();
  const canAdd = ability.can('duty_roster', 'add');
  const canEdit = ability.can('duty_roster', 'edit');
  const canDelete = ability.can('duty_roster', 'delete');

  const shifts = useDrShifts();
  const create = useCreateDrShift();
  const update = useUpdateDrShift();
  const del = useDeleteDrShift();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DutyShiftDto | null>(null);
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '' });

  const rows = useMemo(() => {
    const all = shifts.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((s) => s.name.toLowerCase().includes(q)) : all;
  }, [shifts.data, search]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', startTime: '', endTime: '' });
    setOpen(true);
  }
  function openEdit(s: DutyShiftDto) {
    setEditing(s);
    setForm({ name: s.name, startTime: s.startTime ?? '', endTime: s.endTime ?? '' });
    setOpen(true);
  }
  async function save() {
    if (editing) await update.mutateAsync({ id: editing.id, input: form });
    else await create.mutateAsync(form);
    setOpen(false);
  }
  async function remove(s: DutyShiftDto) {
    const ok = await confirm({
      title: `Delete shift ${s.name}?`,
      description: 'Rosters and assignments that use this shift will lose it.',
      confirmLabel: 'Delete shift',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(s.id);
      toast.success(`Shift ${s.name} deleted`);
    } catch (e) {
      toast.error('Could not delete shift', { description: (e as Error).message });
    }
  }

  const cols: Column<DutyShiftDto>[] = [
    { key: 'name', header: 'Shift Name', className: 'font-medium' },
    { key: 'startLabel', header: 'Shift Start', render: (s) => s.startLabel || '—' },
    { key: 'endLabel', header: 'Shift End', render: (s) => s.endLabel || '—' },
    { key: 'shiftHour', header: 'Shift Hour', render: (s) => s.shiftHour },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Duty Roster</button>
      <PageHeader
        title="Shift"
        actions={canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Shift</Button>}
      />

      <DataTable
        columns={cols}
        rows={rows}
        loading={shifts.isLoading}
        search={search}
        onSearch={setSearch}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={<ExportMenu table={() => ({ title: 'Shift', filename: 'shifts', headers: ['Shift Name', 'Shift Start', 'Shift End', 'Shift Hour'], rows: rows.map((s) => [s.name, s.startLabel, s.endLabel, s.shiftHour]) })} />}
        rowActions={(canEdit || canDelete) ? (s) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => openEdit(s)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
            {canDelete && <button onClick={() => remove(s)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ) : undefined}
      />

      <FormDrawer open={open} title={editing ? 'Edit Shift' : 'Add Shift'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        <div className="space-y-4">
          <Field label="Shift Name" required><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Morning Shift" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Shift Start" required><TextInput type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></Field>
            <Field label="Shift End" required><TextInput type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></Field>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
