'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
  customFieldSchema,
  type CustomFieldType,
} from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import {
  useCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
} from '@/lib/hooks/use-custom-fields';
import { useAbility } from '@/lib/auth-store';
import type { CustomFieldDto } from '@smart-hospital/shared';

export default function CustomFieldsPage() {
  const ability = useAbility();
  const canManage = ability.can('setup', 'add');
  const [entity, setEntity] = useState('patient');
  const { data: fields = [], isLoading } = useCustomFields(entity);
  const create = useCreateCustomField();
  const del = useDeleteCustomField(entity);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns: Column<CustomFieldDto>[] = [
    { key: 'label', header: 'Label', className: 'font-medium' },
    { key: 'fieldType', header: 'Type' },
    { key: 'key', header: 'Key', render: (f) => <code className="text-xs">{f.key}</code> },
    { key: 'required', header: 'Required', render: (f) => (f.required ? 'Yes' : 'No') },
    {
      key: 'options',
      header: 'Options',
      render: (f) => (f.options.length ? f.options.join(', ') : '—'),
    },
  ];

  async function submit() {
    setError(null);
    const parsed = customFieldSchema.safeParse({
      entity,
      label,
      fieldType,
      required,
      options: optionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    await create.mutateAsync(parsed.data);
    setOpen(false);
    setLabel('');
    setOptionsText('');
    setRequired(false);
    setFieldType('text');
  }

  const needsOptions = fieldType === 'select' || fieldType === 'multiselect';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Custom Fields</h1>
          <p className="text-sm text-fg-muted">Extend any module&apos;s forms without code</p>
        </div>
        <div className="w-56">
          <Select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            options={CUSTOM_FIELD_ENTITIES.map((e) => ({ value: e, label: e }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={fields}
        loading={isLoading}
        search=""
        onSearch={() => {}}
        onPage={() => {}}
        onSize={() => {}}
        rowActions={
          canManage
            ? (f) => (
                <button
                  onClick={() => del.mutate(f.id)}
                  aria-label="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            : undefined
        }
        toolbar={
          canManage && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Field
            </Button>
          )
        }
      />

      <FormDrawer
        open={open}
        title={`Add Custom Field — ${entity}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={create.isPending}
      >
        {error && (
          <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <Field label="Label" required>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Field Type" required>
            <Select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              options={CUSTOM_FIELD_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Field>
          {needsOptions && (
            <Field label="Options (comma-separated)" required>
              <TextInput
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="English, Hindi, Bengali"
              />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required field
          </label>
        </div>
      </FormDrawer>
    </div>
  );
}
