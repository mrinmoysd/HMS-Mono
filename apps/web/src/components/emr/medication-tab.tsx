'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MedicationDoseDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import { useMedicines } from '@/lib/hooks/use-departments';
import { useMedication, useAddMedication, type EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';

/** Medication tab: OPD dose list or IPD MAR matrix (date × Dose 1..N). */
export function MedicationTab({ scope, canEdit, mar }: { scope: EncounterScope; canEdit: boolean; mar?: boolean }) {
  const { data: doses = [] } = useMedication(scope);
  const add = useAddMedication(scope);
  const { data: medicines } = useMedicines({ size: 200 });

  const [open, setOpen] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [remarks, setRemarks] = useState('');

  async function save() {
    if (!medicineName.trim()) return;
    await add.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      medicineName,
      dosage: dosage || undefined,
      dateTime: dateTime ? new Date(dateTime) : undefined,
      remarks: remarks || undefined,
    });
    setOpen(false);
    setMedicineName(''); setDosage(''); setRemarks('');
  }

  // MAR: group by date; columns = max doses per date.
  const mat = useMemo(() => {
    const byDate = new Map<string, MedicationDoseDto[]>();
    for (const d of [...doses].reverse()) {
      const day = d.dateTime.slice(0, 10);
      if (!byDate.has(day)) byDate.set(day, []);
      byDate.get(day)!.push(d);
    }
    const maxDoses = Math.max(1, ...[...byDate.values()].map((v) => v.length));
    return { rows: [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)), cols: maxDoses };
  }, [doses]);

  const AddButton = canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Medication</Button>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{mar ? 'Medication (MAR)' : 'Medication'}</h2>
        {AddButton}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        {mar ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                {Array.from({ length: mat.cols }).map((_, i) => <th key={i} className="px-3 py-2.5 font-semibold">Dose {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {mat.rows.length === 0 && <tr><td colSpan={mat.cols + 1} className="px-3 py-10 text-center text-fg-muted">No medication recorded</td></tr>}
              {mat.rows.map(([day, list]) => (
                <tr key={day} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-3 py-2.5 font-medium">{new Date(day).toLocaleDateString()}</td>
                  {Array.from({ length: mat.cols }).map((_, i) => {
                    const d = list[i];
                    return (
                      <td key={i} className="px-3 py-2.5">
                        {d ? (
                          <div>
                            <p className="font-medium">{d.medicineName}</p>
                            <p className="text-xs text-fg-muted">{d.dosage ?? ''} · {new Date(d.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ) : <span className="text-fg-muted">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2.5 font-semibold">Date &amp; Time</th>
                <th className="px-3 py-2.5 font-semibold">Medicine</th>
                <th className="px-3 py-2.5 font-semibold">Dosage</th>
                <th className="px-3 py-2.5 font-semibold">Remarks</th>
                <th className="px-3 py-2.5 font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              {doses.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-fg-muted">No medication recorded</td></tr>}
              {doses.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2.5">{new Date(d.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-3 py-2.5 font-medium">{d.medicineName}</td>
                  <td className="px-3 py-2.5">{d.dosage ?? '—'}</td>
                  <td className="px-3 py-2.5 text-fg-muted">{d.remarks ?? '—'}</td>
                  <td className="px-3 py-2.5 text-fg-muted">{d.createdByName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormDrawer open={open} title="Add Medication Dose" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending}>
        <div className="space-y-4">
          <Field label="Medicine" required>
            <input list="med-list" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} placeholder="Medicine name" className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
            <datalist id="med-list">{(medicines?.data ?? []).map((m) => <option key={m.id} value={m.name} />)}</datalist>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dosage"><TextInput value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" /></Field>
            <Field label="Date & Time"><TextInput type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} /></Field>
          </div>
          <Field label="Remarks"><TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
