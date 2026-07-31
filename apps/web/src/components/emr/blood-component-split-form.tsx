'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useMemo, useState } from 'react';
import { BLOOD_GROUPS, bloodComponentSplitSchema } from '@smart-hospital/shared';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useBloodBags, useSplitBloodComponents } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

const COMPONENT_NAMES = ['Platelets', 'Plasma', 'Cryo', 'Red Cells', 'White Cells & Granulocytes'];

interface Row {
  checked: boolean;
  bagNo: string;
  volume: string;
  unitType: string;
  lot: string;
  institution: string;
}

function emptyRows(): Record<string, Row> {
  return Object.fromEntries(COMPONENT_NAMES.map((name) => [name, { checked: false, bagNo: '', volume: '', unitType: '', lot: '', institution: '' }]));
}

/** "Add Components" — split an available whole-blood bag into one or more named component bags. */
export function BloodComponentSplitForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [bloodGroup, setBloodGroup] = useState('');
  const [bagId, setBagId] = useState('');
  const [rows, setRows] = useState<Record<string, Row>>(emptyRows());
  const [error, setError] = useState<string | null>(null);

  const { data: bags } = useBloodBags({ kind: 'blood', status: 'available', bloodGroup: bloodGroup || undefined, size: 200 });
  const split = useSplitBloodComponents();

  if (!open) return null;

  function setRow(name: string, patch: Partial<Row>) {
    setRows((r) => ({ ...r, [name]: { ...r[name], ...patch } }));
  }

  function reset() {
    setBloodGroup('');
    setBagId('');
    setRows(emptyRows());
    setError(null);
  }

  const selectedItems = useMemo(
    () =>
      COMPONENT_NAMES.filter((name) => rows[name].checked).map((name) => ({
        component: name,
        bagNo: rows[name].bagNo,
        volume: rows[name].volume,
        unitType: rows[name].unitType,
        lot: rows[name].lot,
        institution: rows[name].institution,
      })),
    [rows],
  );

  async function submit() {
    setError(null);
    const parsed = bloodComponentSplitSchema.safeParse({ bagId, items: selectedItems });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      await split.mutateAsync(parsed.data);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Components"
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} loading={split.isPending}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
          {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Blood Group" required>
              <Select value={bloodGroup} onChange={(e) => { setBloodGroup(e.target.value); setBagId(''); }} placeholder="Select…" options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
            </Field>
            <Field label="Bag No" required>
              <Select value={bagId} onChange={(e) => setBagId(e.target.value)} placeholder="Select…" options={(bags?.data ?? []).map((b) => ({ value: b.id, label: `${b.bagNo} — ${b.donorName ?? ''}` }))} />
            </Field>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-2 py-2 font-semibold">Component Name</th>
                  <th className="px-2 py-2 font-semibold">Bag No</th>
                  <th className="px-2 py-2 font-semibold">Volume</th>
                  <th className="px-2 py-2 font-semibold">Unit Type</th>
                  <th className="px-2 py-2 font-semibold">Lot</th>
                  <th className="px-2 py-2 font-semibold">Institution</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_NAMES.map((name) => (
                  <tr key={name} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2">
                      <Checkbox label="{name}" checked={rows[name].checked} onChange={(e) => setRow(name, { checked: e.target.checked })} />
                    </td>
                    <td className="px-1 py-1"><input value={rows[name].bagNo} onChange={(e) => setRow(name, { bagNo: e.target.value })} disabled={!rows[name].checked} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-sm disabled:opacity-50" /></td>
                    <td className="px-1 py-1"><input value={rows[name].volume} onChange={(e) => setRow(name, { volume: e.target.value })} disabled={!rows[name].checked} className="h-8 w-24 rounded-sm border border-border bg-surface px-2 text-sm disabled:opacity-50" /></td>
                    <td className="px-1 py-1"><input value={rows[name].unitType} onChange={(e) => setRow(name, { unitType: e.target.value })} disabled={!rows[name].checked} className="h-8 w-24 rounded-sm border border-border bg-surface px-2 text-sm disabled:opacity-50" /></td>
                    <td className="px-1 py-1"><input value={rows[name].lot} onChange={(e) => setRow(name, { lot: e.target.value })} disabled={!rows[name].checked} className="h-8 w-24 rounded-sm border border-border bg-surface px-2 text-sm disabled:opacity-50" /></td>
                    <td className="px-1 py-1"><input value={rows[name].institution} onChange={(e) => setRow(name, { institution: e.target.value })} disabled={!rows[name].checked} className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-sm disabled:opacity-50" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

    </Modal>
  );
}

export { COMPONENT_NAMES };
