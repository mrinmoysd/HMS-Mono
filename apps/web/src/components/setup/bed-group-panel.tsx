'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { BedGroupDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import {
  useBedGroups,
  useCreateBedGroup,
  useUpdateBedGroup,
  useDeleteBedGroup,
} from '@/lib/hooks/use-ipd';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

const DEFAULT_COLOR = '#2563eb';

/** Bed Group: name + floor + color — Setup → Beds → Bed Group. */
export function BedGroupPanel() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const { data, isLoading } = useBedGroups();
  const rows = data?.data ?? [];
  const { data: floors } = useCatalog('floor', { size: 100 });

  const create = useCreateBedGroup();
  const update = useUpdateBedGroup();
  const remove = useDeleteBedGroup();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BedGroupDto | null>(null);
  const [name, setName] = useState('');
  const [floorId, setFloorId] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: BedGroupDto) {
    if (!(await confirmDelete('bed group' + ` ${row.name}`))) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(`${row.name} deleted`);
    } catch (e) {
      toast.error('Could not delete', { description: (e as Error).message });
    }
  }

  function openAdd() {
    setEditing(null);
    setName('');
    setFloorId('');
    setColor(DEFAULT_COLOR);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: BedGroupDto) {
    setEditing(row);
    setName(row.name);
    setFloorId(row.floorId ?? '');
    setColor(row.color || DEFAULT_COLOR);
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = { name: name.trim(), floorId: floorId || null, color };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<BedGroupDto>[] = [
    {
      key: 'color',
      header: '',
      className: 'w-8',
      render: (g) => <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: g.color || '#94a3b8' }} />,
    },
    { key: 'name', header: 'Bed Group', className: 'font-medium' },
    { key: 'floorName', header: 'Floor', render: (g) => g.floorName ?? '—' },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        search=""
        onSearch={() => {}}
        onPage={() => {}}
        onSize={() => {}}
        toolbar={canAdd && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Bed Group</Button>}
        rowActions={
          canEdit || canDelete
            ? (row) => (
                <>
                  {canEdit && (
                    <button onClick={() => openEdit(row)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => onDelete(row)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )
            : undefined
        }
      />

      <FormDrawer
        open={open}
        title={editing ? 'Edit Bed Group' : 'Add Bed Group'}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      >
        {formError && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <div className="space-y-4">
          <Field label="Bed Group Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward A" autoFocus />
          </Field>
          <Field label="Floor">
            <Select value={floorId} onChange={(e) => setFloorId(e.target.value)} placeholder="None"
              options={(floors?.data ?? []).map((f) => ({ value: f.id, label: f.name }))} />
          </Field>
          <Field label="Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-sm border border-border bg-surface"
                aria-label="Bed group color"
              />
              <TextInput value={color} onChange={(e) => setColor(e.target.value)} className="max-w-32" />
            </div>
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
