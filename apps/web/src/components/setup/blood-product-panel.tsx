'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { BLOOD_GROUPS, type BloodProductDto, type BloodProductInput } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import {
  useBloodProducts,
  useCreateBloodProduct,
  useUpdateBloodProduct,
  useDeleteBloodProduct,
} from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';

const EMPTY_FORM = { name: '', bloodGroup: '', component: '', rate: '' };

/** Blood Product: name + blood group + component + rate — Setup → Blood Bank → Product. */
export function BloodProductPanel() {
  const ability = useAbility();
  const canAdd = ability.can('blood_bank', 'add');
  const canEdit = ability.can('blood_bank', 'edit');
  const canDelete = ability.can('blood_bank', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading } = useBloodProducts({ search, page, size });

  const create = useCreateBloodProduct();
  const update = useUpdateBloodProduct();
  const remove = useDeleteBloodProduct();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BloodProductDto | null>(null);
  const [f, setF] = useState(EMPTY_FORM);
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: BloodProductDto) {
    if (!(await confirmDelete('blood product' + ` ${row.name}`))) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(`${row.name} deleted`);
    } catch (e) {
      toast.error('Could not delete', { description: (e as Error).message });
    }
  }

  function openAdd() {
    setEditing(null);
    setF(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: BloodProductDto) {
    setEditing(row);
    setF({ name: row.name, bloodGroup: row.bloodGroup ?? '', component: row.component ?? '', rate: String(row.rate) });
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!f.name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = {
      name: f.name.trim(),
      bloodGroup: f.bloodGroup as BloodProductInput['bloodGroup'],
      component: f.component,
      rate: f.rate ? Number(f.rate) : 0,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<BloodProductDto>[] = [
    { key: 'name', header: 'Product', className: 'font-medium' },
    { key: 'bloodGroup', header: 'Blood Group', render: (p) => p.bloodGroup ?? '—' },
    { key: 'component', header: 'Component', render: (p) => p.component ?? '—' },
    { key: 'rate', header: 'Rate', className: 'tabular', render: (p) => p.rate.toFixed(2) },
    { key: 'units', header: 'Units in Stock', className: 'tabular' },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onPage={setPage}
        onSize={(s) => { setSize(s); setPage(1); }}
        toolbar={
          canAdd && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Product
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
        title={editing ? 'Edit Blood Product' : 'Add Blood Product'}
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
          <Field label="Product Name" required>
            <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Whole Blood" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Blood Group">
              <Select value={f.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="None"
                options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
            </Field>
            <Field label="Component">
              <TextInput value={f.component} onChange={(e) => set('component', e.target.value)} placeholder="e.g. Plasma" />
            </Field>
          </div>
          <Field label="Rate">
            <TextInput type="number" value={f.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" />
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
