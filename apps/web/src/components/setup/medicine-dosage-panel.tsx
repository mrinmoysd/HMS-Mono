'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { MedicineDosageDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import {
  useMedicineDosages,
  useCreateMedicineDosage,
  useUpdateMedicineDosage,
  useDeleteMedicineDosage,
} from '@/lib/hooks/use-departments';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

/** Medicine Dosage: Category + Dosage value + Unit quick-pick — Setup → Pharmacy → Medicine Dosage. */
export function MedicineDosagePanel() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading } = useMedicineDosages({ search, page, size });
  const { data: cats } = useCatalog('medicine-category', { size: 100 });
  const { data: units } = useCatalog('pharma-unit', { size: 100 });

  const create = useCreateMedicineDosage();
  const update = useUpdateMedicineDosage();
  const remove = useDeleteMedicineDosage();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicineDosageDto | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [dosage, setDosage] = useState('');
  const [unitId, setUnitId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: MedicineDosageDto) {
    if (!(await confirmDelete('dosage' + ` ${row.dosage}`))) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(`${row.dosage} deleted`);
    } catch (e) {
      toast.error('Could not delete', { description: (e as Error).message });
    }
  }

  function openAdd() {
    setEditing(null);
    setCategoryId('');
    setDosage('');
    setUnitId('');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: MedicineDosageDto) {
    setEditing(row);
    setCategoryId(row.categoryId ?? '');
    setDosage(row.dosage);
    setUnitId(row.unitId ?? '');
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!dosage.trim()) {
      setFormError('Dosage is required');
      return;
    }
    const input = { categoryId: categoryId || null, dosage: dosage.trim(), unitId: unitId || null };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<MedicineDosageDto>[] = [
    { key: 'categoryName', header: 'Category', render: (d) => d.categoryName ?? '—' },
    { key: 'dosage', header: 'Dosage', className: 'font-medium' },
    { key: 'unitName', header: 'Unit', render: (d) => d.unitName ?? '—' },
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
              <Plus className="h-4 w-4" /> Add Medicine Dosage
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
        title={editing ? 'Edit Medicine Dosage' : 'Add Medicine Dosage'}
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
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="None"
              options={(cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Dosage" required>
            <TextInput value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" autoFocus />
          </Field>
          <Field label="Unit">
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="None"
              options={(units?.data ?? []).map((u) => ({ value: u.id, label: u.name }))} />
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
