'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { LeaveTypeDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
} from '@/lib/hooks/use-hr';
import { useAbility } from '@/lib/auth-store';

/** Leave Type: name + annual quota — Setup → Human Resources → Leave Type. */
export function LeaveTypePanel() {
  const ability = useAbility();
  const canAdd = ability.can('human_resource', 'add');
  const canEdit = ability.can('human_resource', 'edit');
  const canDelete = ability.can('human_resource', 'delete');

  const { data, isLoading } = useLeaveTypes();
  const rows = data ?? [];

  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const remove = useDeleteLeaveType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeDto | null>(null);
  const [name, setName] = useState('');
  const [quota, setQuota] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: LeaveTypeDto) {
    if (!(await confirmDelete('leave type' + ` ${row.name}`))) return;
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
    setQuota('');
    setFormError(null);
    setOpen(true);
  }

  function openEdit(row: LeaveTypeDto) {
    setEditing(row);
    setName(row.name);
    setQuota(String(row.quota));
    setFormError(null);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    const input = { name: name.trim(), quota: quota ? Number(quota) : 0 };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  }

  const columns: Column<LeaveTypeDto>[] = [
    { key: 'name', header: 'Leave Type', className: 'font-medium' },
    { key: 'quota', header: 'Annual Quota', className: 'tabular', render: (t) => `${t.quota} days` },
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
        toolbar={
          canAdd && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Leave Type
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
        title={editing ? 'Edit Leave Type' : 'Add Leave Type'}
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
          <Field label="Leave Type" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sick Leave" autoFocus />
          </Field>
          <Field label="Annual Quota (days)">
            <TextInput type="number" value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="0" />
          </Field>
        </div>
      </FormDrawer>

    </div>
  );
}
