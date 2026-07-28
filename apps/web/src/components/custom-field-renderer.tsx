'use client';

import type { CustomFieldDto } from '@smart-hospital/shared';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';

interface Props {
  fields: CustomFieldDto[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
}

/** Renders custom fields (FRD §2.29.2) as typed inputs on any Add/Edit form. */
export function CustomFieldRenderer({ fields, values, onChange, errors }: Props) {
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map((f) => {
        const val = values[f.key];
        const colSpan = f.gridWidth >= 12 ? 'col-span-2' : '';
        return (
          <Field
            key={f.id}
            label={f.label}
            required={f.required}
            error={errors?.[f.key]}
            className={colSpan}
          >
            {renderInput(f, val, (v) => onChange(f.key, v))}
          </Field>
        );
      })}
    </>
  );
}

function renderInput(f: CustomFieldDto, val: unknown, set: (v: unknown) => void): React.ReactNode {
  const s = (val ?? '') as string;
  switch (f.fieldType) {
    case 'textarea':
      return <TextArea value={s} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <TextInput type="number" value={s} onChange={(e) => set(e.target.value)} />;
    case 'date':
      return <TextInput type="date" value={s} onChange={(e) => set(e.target.value)} />;
    case 'datetime':
      return <TextInput type="datetime-local" value={s} onChange={(e) => set(e.target.value)} />;
    case 'color':
      return <TextInput type="color" value={s || '#1E63E9'} onChange={(e) => set(e.target.value)} />;
    case 'hyperlink':
      return <TextInput type="url" value={s} placeholder="https://…" onChange={(e) => set(e.target.value)} />;
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={Boolean(val)}
          onChange={(e) => set(e.target.checked)}
          className="h-4 w-4"
        />
      );
    case 'select':
      return (
        <Select
          value={s}
          onChange={(e) => set(e.target.value)}
          placeholder="Select…"
          options={f.options.map((o) => ({ value: o, label: o }))}
        />
      );
    case 'multiselect':
      return (
        <Select
          multiple
          value={Array.isArray(val) ? (val as string[]) : []}
          onChange={(e) =>
            set([...e.target.selectedOptions].map((o) => o.value))
          }
          options={f.options.map((o) => ({ value: o, label: o }))}
        />
      );
    default:
      return <TextInput value={s} onChange={(e) => set(e.target.value)} />;
  }
}
