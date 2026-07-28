'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { PharmaSupplierDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import {
  usePharmaSuppliers,
  useCreatePharmaSupplier,
  useUpdatePharmaSupplier,
  useDeletePharmaSupplier,
} from '@/lib/hooks/use-departments';
import { useAbility } from '@/lib/auth-store';

const EMPTY_FORM = { name: '', contact: '', contactPerson: '', contactPhone: '', drugLicenseNumber: '', address: '' };

/** Pharma Supplier: name + contact + drug license — Setup → Pharmacy → Supplier. */
export function PharmaSupplierPanel() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const { data, isLoading, error } = usePharmaSuppliers({ search, page, size });

  const create = useCreatePharmaSupplier();
  const update = useUpdatePharmaSupplier();
  const remove = useDeletePharmaSupplier();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PharmaSupplierDto | null>(null);
  const [f, setF] = useState(EMPTY_FORM);
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PharmaSupplierDto | null>(null);

  function openAdd() {
    setEditing(null);
    setF(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: PharmaSupplierDto) {
    setEditing(row);
    setF({
      name: row.name,
      contact: row.contact ?? '',
      contactPerson: row.contactPerson ?? '',
      contactPhone: row.contactPhone ?? '',
      drugLicenseNumber: row.drugLicenseNumber ?? '',
      address: row.address ?? '',
    });
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!f.name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = { ...f, name: f.name.trim() };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<PharmaSupplierDto>[] = [
    { key: 'name', header: 'Supplier', className: 'font-medium' },
    { key: 'contactPerson', header: 'Contact Person', render: (s) => s.contactPerson ?? '—' },
    { key: 'contact', header: 'Contact', render: (s) => s.contact ?? '—' },
    { key: 'drugLicenseNumber', header: 'Drug License No.', render: (s) => s.drugLicenseNumber ?? '—' },
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
              <Plus className="h-4 w-4" /> Add Supplier
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
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
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
          <Field label="Supplier Name" required>
            <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact"><TextInput value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Phone / email" /></Field>
            <Field label="Drug License No."><TextInput value={f.drugLicenseNumber} onChange={(e) => set('drugLicenseNumber', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Person"><TextInput value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></Field>
            <Field label="Contact Phone"><TextInput value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
          </div>
          <Field label="Address"><TextArea value={f.address} onChange={(e) => set('address', e.target.value)} rows={2} /></Field>
        </div>
      </FormDrawer>

      {deleting && (
        <ConfirmDeleteModal
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
  name,
  pending,
  onCancel,
  onConfirm,
}: {
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
          Delete supplier <strong>{name}</strong>? This cannot be undone.
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
