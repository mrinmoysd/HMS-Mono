'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { TaxCategoryDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import {
  useTaxCategories,
  useCreateTaxCategory,
  useUpdateTaxCategory,
  useDeleteTaxCategory,
} from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

/** Tax Category: name + percent — Setup → Charges → Tax Category. */
export function TaxCategoryPanel() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading, error } = useTaxCategories({ search, page, size });

  const create = useCreateTaxCategory();
  const update = useUpdateTaxCategory();
  const remove = useDeleteTaxCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCategoryDto | null>(null);
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: TaxCategoryDto) {
    if (!(await confirmDelete('tax category' + ` ${row.name}`))) return;
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
    setPercent('');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: TaxCategoryDto) {
    setEditing(row);
    setName(row.name);
    setPercent(String(row.percent));
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = { name: name.trim(), percent: percent ? Number(percent) : 0 };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<TaxCategoryDto>[] = [
    { key: 'name', header: 'Tax Category', className: 'font-medium' },
    { key: 'percent', header: 'Percent', className: 'tabular', render: (t) => `${t.percent}%` },
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
              <Plus className="h-4 w-4" /> Add Tax Category
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
        title={editing ? 'Edit Tax Category' : 'Add Tax Category'}
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
          <Field label="Tax Category" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GST" autoFocus />
          </Field>
          <Field label="Percent">
            <TextInput type="number" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
