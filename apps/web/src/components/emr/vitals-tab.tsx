'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { useVitalTypes, useVitalMatrix, useAddVitals, useUpdateVital, useDeleteVital } from '@/lib/hooks/use-emr';

interface Row {
  vitalTypeId: string;
  value: string;
  date: string;
}

/** Reusable Vitals tab: date×type matrix (reference ranges in headers) + Add Vital multi-row. */
export function VitalsTab({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const { data: types } = useVitalTypes();
  const { data: matrix, isLoading } = useVitalMatrix(patientId);
  const add = useAddVitals(patientId);
  const update = useUpdateVital(patientId);
  const del = useDeleteVital(patientId);

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<Row[]>([{ vitalTypeId: '', value: '', date: today }]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const cols = matrix?.columns ?? [];

  async function save() {
    const valid = rows.filter((r) => r.vitalTypeId && r.value);
    if (valid.length === 0) return;
    await add.mutateAsync({
      patientId,
      readings: valid.map((r) => ({ vitalTypeId: r.vitalTypeId, value: r.value, recordedAt: new Date(r.date) })),
    });
    setOpen(false);
    setRows([{ vitalTypeId: '', value: '', date: today }]);
  }

  function openEdit(cellId: string, value: string) {
    setEditingId(cellId);
    setEditValue(value);
  }

  async function saveEdit() {
    if (!editingId || !editValue.trim()) return;
    await update.mutateAsync({ id: editingId, input: { value: editValue } });
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vitals</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Vital</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              {cols.map((c) => (
                <th key={c.vitalTypeId} className="px-3 py-2.5 font-semibold">
                  {c.name}
                  {(c.refMin != null || c.refMax != null) && (
                    <span className="block font-normal text-[11px] text-fg-muted">
                      ({c.refMin ?? ''}–{c.refMax ?? ''} {c.unit ?? ''})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-fg-muted">Loading…</td></tr>}
            {matrix && matrix.rows.length === 0 && <tr><td colSpan={cols.length + 1} className="px-3 py-10 text-center text-fg-muted">No vitals recorded</td></tr>}
            {matrix?.rows.map((row) => (
              <tr key={row.date} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{new Date(row.date).toLocaleDateString()}</td>
                {cols.map((c) => {
                  const cell = row.cells[c.vitalTypeId];
                  return (
                    <td key={c.vitalTypeId} className="px-3 py-2.5 tabular">
                      {cell && (
                        <div className="flex items-center gap-1">
                          <span>
                            {cell.value}{' '}
                            <span className="text-xs text-fg-muted">
                              ({new Date(cell.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </span>
                          {canEdit && (
                            <>
                              <button onClick={() => openEdit(cell.id, cell.value)} aria-label="Edit" title="Edit" className="flex h-6 w-6 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => del.mutate(cell.id)} aria-label="Delete" title="Delete" className="flex h-6 w-6 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Add Vital" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending}>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Field label={i === 0 ? 'Vital Name' : ''} required={i === 0}>
                <Select value={r.vitalTypeId} onChange={(e) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, vitalTypeId: e.target.value } : x)))}
                  placeholder="Select…" options={(types ?? []).map((t) => ({ value: t.id, label: t.name }))} />
              </Field>
              <Field label={i === 0 ? 'Value' : ''} required={i === 0}>
                <TextInput value={r.value} onChange={(e) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} />
              </Field>
              <Field label={i === 0 ? 'Date' : ''} required={i === 0}>
                <TextInput type="date" value={r.date} onChange={(e) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, date: e.target.value } : x)))} />
              </Field>
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="mb-2 flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { vitalTypeId: '', value: '', date: today }])}>
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>
      </FormDrawer>

      <FormDrawer open={!!editingId} title="Edit Vital" onClose={() => setEditingId(null)} onSubmit={saveEdit} submitting={update.isPending}>
        <Field label="Value" required>
          <TextInput value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        </Field>
      </FormDrawer>
    </div>
  );
}
