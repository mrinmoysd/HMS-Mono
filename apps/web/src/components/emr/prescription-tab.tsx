'use client';

import { useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import type { PrescriptionDto, PrescriptionItemInput } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { useMedicines } from '@/lib/hooks/use-departments';
import { usePrescriptions, useCreatePrescription, type EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';
import { printDocument } from '@/lib/print';

const EMPTY: PrescriptionItemInput = { medicineName: '', dosage: '', interval: '', duration: '', instruction: '' };

/** Prescription tab: Rx list + Add Prescription builder + printable Rx. Reused by OPD & IPD. */
export function PrescriptionTab({ scope, canEdit, patientName }: { scope: EncounterScope; canEdit: boolean; patientName?: string }) {
  const { data: list = [] } = usePrescriptions(scope);
  const create = useCreatePrescription(scope);
  const { data: medicines } = useMedicines({ size: 200 });

  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [findings, setFindings] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<PrescriptionItemInput[]>([{ ...EMPTY }]);

  function upd(i: number, patch: Partial<PrescriptionItemInput>) {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    const valid = items.filter((it) => it.medicineName.trim());
    if (valid.length === 0) return;
    await create.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      symptoms: symptoms || undefined,
      findings: findings || undefined,
      note: note || undefined,
      findingList: [],
      findingPrint: true,
      pathologyTestIds: [],
      radiologyTestIds: [],
      notifyRoles: [],
      items: valid,
    });
    setOpen(false);
    setSymptoms(''); setFindings(''); setNote(''); setItems([{ ...EMPTY }]);
  }

  function printRx(rx: PrescriptionDto) {
    const meta: [string, string][] = [
      ['Patient', patientName ?? '—'],
      ['Date', new Date(rx.createdAt).toLocaleDateString()],
      ['Prescribed By', rx.prescribedByName ?? '—'],
    ];
    if (rx.symptoms) meta.push(['Symptoms', rx.symptoms]);
    if (rx.findings) meta.push(['Findings', rx.findings]);
    printDocument({
      documentTitle: 'Prescription',
      heading: 'Prescription (Rx)',
      meta,
      sections: [
        {
          table: {
            headers: ['Medicine', 'Dosage', 'Interval', 'Duration', 'Instruction'],
            rows: rx.items.map((it) => [it.medicineName, it.dosage ?? '', it.interval ?? '', it.duration ?? '', it.instruction ?? '']),
          },
        },
        ...(rx.note ? [{ heading: 'Note', text: rx.note }] : []),
      ],
      footer: "Doctor's Signature",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prescriptions</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Prescription</Button>}
      </div>

      {list.length === 0 && <div className="rounded-md border border-border bg-surface p-10 text-center text-sm text-fg-muted">No prescriptions</div>}

      <div className="space-y-3">
        {list.map((rx) => (
          <div key={rx.id} className="rounded-md border border-border bg-surface p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="text-sm">
                <p className="font-medium">{new Date(rx.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="text-xs text-fg-muted">{rx.prescribedByName ?? '—'}{rx.symptoms ? ` · ${rx.symptoms}` : ''}</p>
              </div>
              <button onClick={() => printRx(rx)} className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-fg-muted hover:bg-border/50">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="py-1 pr-3 font-semibold">Medicine</th><th className="py-1 pr-3 font-semibold">Dosage</th><th className="py-1 pr-3 font-semibold">Interval</th><th className="py-1 pr-3 font-semibold">Duration</th><th className="py-1 font-semibold">Instruction</th>
                </tr>
              </thead>
              <tbody>
                {rx.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{it.medicineName}</td>
                    <td className="py-1.5 pr-3">{it.dosage ?? '—'}</td>
                    <td className="py-1.5 pr-3">{it.interval ?? '—'}</td>
                    <td className="py-1.5 pr-3">{it.duration ?? '—'}</td>
                    <td className="py-1.5 text-fg-muted">{it.instruction ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <FormDrawer open={open} title="Add Prescription" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Symptoms"><TextInput value={symptoms} onChange={(e) => setSymptoms(e.target.value)} /></Field>
            <Field label="Findings"><TextInput value={findings} onChange={(e) => setFindings(e.target.value)} /></Field>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Medicines</p>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_1.2fr_auto] items-center gap-2">
                  <input list={`med-${i}`} value={it.medicineName} onChange={(e) => upd(i, { medicineName: e.target.value })} placeholder="Medicine" className="rounded-sm border border-border bg-surface px-2 py-1 text-sm" />
                  <datalist id={`med-${i}`}>{(medicines?.data ?? []).map((m) => <option key={m.id} value={m.name} />)}</datalist>
                  <input value={it.dosage} onChange={(e) => upd(i, { dosage: e.target.value })} placeholder="Dosage" className="rounded-sm border border-border bg-surface px-2 py-1 text-sm" />
                  <input value={it.interval} onChange={(e) => upd(i, { interval: e.target.value })} placeholder="Interval" className="rounded-sm border border-border bg-surface px-2 py-1 text-sm" />
                  <input value={it.duration} onChange={(e) => upd(i, { duration: e.target.value })} placeholder="Duration" className="rounded-sm border border-border bg-surface px-2 py-1 text-sm" />
                  <input value={it.instruction} onChange={(e) => upd(i, { instruction: e.target.value })} placeholder="Instruction" className="rounded-sm border border-border bg-surface px-2 py-1 text-sm" />
                  <button type="button" onClick={() => setItems((r) => r.filter((_, idx) => idx !== i))} className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setItems((r) => [...r, { ...EMPTY }])}><Plus className="h-4 w-4" /> Add medicine</Button>
          </div>
          <Field label="Note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
