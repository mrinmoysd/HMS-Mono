'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { CatalogItemDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import {
  useCatalog,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
} from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

interface SimpleCatalogPanelProps {
  /** Generic masters catalog key, e.g. "department". */
  catalog: string;
  /** Singular display label, e.g. "Department". */
  label: string;
  placeholder?: string;
}

/**
 * Generic name-only catalog CRUD panel (list + add/edit/delete) backed by the
 * `/masters/:catalog` engine. Covers the ~15 Setup master lists that are just `{ name }`.
 */
export function SimpleCatalogPanel({ catalog, label, placeholder }: SimpleCatalogPanelProps) {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading, error } = useCatalog(catalog, { search, page, size });

  const create = useCreateCatalogItem(catalog);
  const update = useUpdateCatalogItem(catalog);
  const remove = useDeleteCatalogItem(catalog);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItemDto | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CatalogItemDto | null>(null);

  function openAdd() {
    setEditing(null);
    setName('');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: CatalogItemDto) {
    setEditing(row);
    setName(row.name);
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      setFormError(`${label} name is required`);
      return;
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, name: name.trim() });
    } else {
      await create.mutateAsync(name.trim());
    }
    setOpen(false);
  }

  const columns: Column<CatalogItemDto>[] = [{ key: 'name', header: label, className: 'font-medium' }];

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
              <Plus className="h-4 w-4" /> Add {label}
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
                      onClick={() => setDeleting(row)}
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
        title={editing ? `Edit ${label}` : `Add ${label}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      >
        {formError && (
          <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <Field label={label} required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder ?? `e.g. ${label}`} autoFocus />
        </Field>
      </FormDrawer>

      {deleting && (
        <ConfirmDeleteModal
          label={label}
          name={deleting.name}
          pending={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  label,
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  label: string;
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-md border border-border bg-surface p-5 shadow-lg">
        <p className="text-sm">
          Delete {label.toLowerCase()} <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
