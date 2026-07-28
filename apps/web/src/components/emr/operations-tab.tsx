'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { OperationRecordDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { useOperations, useCreateOperation } from '@/lib/hooks/use-operations-clinical';
import type { EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';

/** Operations (OT) tab: OT records with staff + anesthesia. Reused by OPD & IPD. */
export function OperationsTab({ scope, canEdit }: { scope: EncounterScope; canEdit: boolean }) {
  const { data: ops = [] } = useOperations(scope);
  const create = useCreateOperation(scope);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<OperationRecordDto | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name?.trim()) return;
    await create.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      name: f.name,
      date: new Date(date),
      category: f.category || undefined,
      consultant: f.consultant || undefined,
      assistant1: f.assistant1 || undefined,
      assistant2: f.assistant2 || undefined,
      anesthetist: f.anesthetist || undefined,
      anesthesiaType: f.anesthesiaType || undefined,
      otTechnician: f.otTechnician || undefined,
      otAssistant: f.otAssistant || undefined,
      result: f.result || undefined,
      refNo: f.refNo || undefined,
      remark: f.remark || undefined,
    });
    setOpen(false);
    setF({});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Operations</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Operation</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Operation</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Consultant</th>
              <th className="px-3 py-2.5 font-semibold">Anaesthesia</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-fg-muted">No operations recorded</td></tr>}
            {ops.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5">{new Date(o.date).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 font-medium">{o.name}</td>
                <td className="px-3 py-2.5">{o.category ?? '—'}</td>
                <td className="px-3 py-2.5">{o.consultant ?? '—'}</td>
                <td className="px-3 py-2.5">{o.anesthesiaType ?? '—'}</td>
                <td className="px-3 py-2.5 text-right"><button onClick={() => setDetail(o)} className="text-xs text-primary hover:underline">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Add Operation" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Operation Name" required className="col-span-2"><TextInput value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Category"><TextInput value={f.category ?? ''} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Consultant"><TextInput value={f.consultant ?? ''} onChange={(e) => set('consultant', e.target.value)} /></Field>
          <Field label="Reference No."><TextInput value={f.refNo ?? ''} onChange={(e) => set('refNo', e.target.value)} /></Field>
          <Field label="Assistant 1"><TextInput value={f.assistant1 ?? ''} onChange={(e) => set('assistant1', e.target.value)} /></Field>
          <Field label="Assistant 2"><TextInput value={f.assistant2 ?? ''} onChange={(e) => set('assistant2', e.target.value)} /></Field>
          <Field label="Anesthetist"><TextInput value={f.anesthetist ?? ''} onChange={(e) => set('anesthetist', e.target.value)} /></Field>
          <Field label="Anaesthesia Type"><TextInput value={f.anesthesiaType ?? ''} onChange={(e) => set('anesthesiaType', e.target.value)} /></Field>
          <Field label="OT Technician"><TextInput value={f.otTechnician ?? ''} onChange={(e) => set('otTechnician', e.target.value)} /></Field>
          <Field label="OT Assistant"><TextInput value={f.otAssistant ?? ''} onChange={(e) => set('otAssistant', e.target.value)} /></Field>
          <Field label="Result"><TextInput value={f.result ?? ''} onChange={(e) => set('result', e.target.value)} /></Field>
          <Field label="Remark" className="col-span-2"><TextArea value={f.remark ?? ''} onChange={(e) => set('remark', e.target.value)} /></Field>
        </div>
      </FormDrawer>

      <FormDrawer open={!!detail} title="Operation Details" onClose={() => setDetail(null)} onSubmit={() => setDetail(null)} submitLabel="Close">
        {detail && (
          <div className="space-y-1.5 text-sm">
            {([
              ['Operation', detail.name], ['Category', detail.category], ['Date', new Date(detail.date).toLocaleDateString()],
              ['Consultant', detail.consultant], ['Assistant 1', detail.assistant1], ['Assistant 2', detail.assistant2],
              ['Anesthetist', detail.anesthetist], ['Anaesthesia Type', detail.anesthesiaType], ['OT Technician', detail.otTechnician],
              ['OT Assistant', detail.otAssistant], ['Result', detail.result], ['Reference No.', detail.refNo], ['Remark', detail.remark],
            ] as [string, string | null][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 border-b border-border/60 py-1.5">
                <span className="text-fg-muted">{k}</span><span className="text-right font-medium">{v || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
