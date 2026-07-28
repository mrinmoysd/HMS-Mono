'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CHARGE_MODULES, type ChargeModule, type ChargeTypeDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import {
  useChargeTypes,
  useCreateChargeType,
  useUpdateChargeType,
  useDeleteChargeType,
} from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

const MODULE_LABELS: Record<ChargeModule, string> = {
  appointment: 'Appointment',
  opd: 'OPD',
  ipd: 'IPD',
  pathology: 'Pathology',
  radiology: 'Radiology',
  'blood-bank': 'Blood Bank',
  ambulance: 'Ambulance',
};

/** Charge Type: name + module-visibility checkbox grid — Setup → Charges → Charge Type. */
export function ChargeTypePanel() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading, error } = useChargeTypes({ search, page, size });

  const create = useCreateChargeType();
  const update = useUpdateChargeType();
  const remove = useDeleteChargeType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeTypeDto | null>(null);
  const [name, setName] = useState('');
  const [modules, setModules] = useState<Set<ChargeModule>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: ChargeTypeDto) {
    if (!(await confirmDelete('charge type' + ` ${row.name}`))) return;
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
    setModules(new Set());
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: ChargeTypeDto) {
    setEditing(row);
    setName(row.name);
    setModules(new Set(row.modules));
    setFormError(null);
    setOpen(true);
  }

  function toggleModule(m: ChargeModule) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  async function submit() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = { name: name.trim(), modules: [...modules] };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<ChargeTypeDto>[] = [
    { key: 'name', header: 'Charge Type', className: 'font-medium' },
    {
      key: 'modules',
      header: 'Modules',
      render: (t) =>
        t.modules.length === 0 ? (
          <span className="text-fg-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {t.modules.map((m) => (
              <span key={m} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {MODULE_LABELS[m]}
              </span>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        error={error ? 'Failed to load' : undefined}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={
          canAdd && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Charge Type
            </Button>
          )
        }
        rowActions={
          canEdit || canDelete
            ? (row) => (
                <>
                  {canEdit && (
                    <button
                      onClick={() => openEdit(row)}
                      aria-label="Edit"
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      aria-label="Delete"
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                    >
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
        title={editing ? 'Edit Charge Type' : 'Add Charge Type'}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      >
        {formError && (
          <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="space-y-4">
          <Field label="Charge Type" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Consultation Fee" autoFocus />
          </Field>
          <Field label="Visible In Modules">
            <div className="grid grid-cols-2 gap-2">
              {CHARGE_MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={modules.has(m)} onChange={() => toggleModule(m)} />
                  {MODULE_LABELS[m]}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
