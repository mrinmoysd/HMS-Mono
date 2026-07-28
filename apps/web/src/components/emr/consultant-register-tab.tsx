'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { useConsultantRegister, useAddConsultantRegister } from '@/lib/hooks/use-ipd-clinical';
import type { EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';

/** Consultant Register tab (IPD): consultant visits + instructions. */
export function ConsultantRegisterTab({ scope, canEdit }: { scope: EncounterScope; canEdit: boolean }) {
  const { data: rows = [] } = useConsultantRegister(scope);
  const add = useAddConsultantRegister(scope);
  const [open, setOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [instruction, setInstruction] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [appliedDate, setAppliedDate] = useState(today);
  const [consultantDate, setConsultantDate] = useState('');

  async function save() {
    if (!doctorName.trim()) return;
    await add.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      doctorName,
      instruction: instruction || undefined,
      appliedDate: new Date(appliedDate),
      consultantDate: consultantDate ? new Date(consultantDate) : undefined,
    });
    setOpen(false);
    setDoctorName(''); setInstruction(''); setConsultantDate('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Consultant Register</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Consultant</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Applied Date</th>
              <th className="px-3 py-2.5 font-semibold">Consultant Doctor</th>
              <th className="px-3 py-2.5 font-semibold">Consultant Date</th>
              <th className="px-3 py-2.5 font-semibold">Instruction</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-fg-muted">No consultant entries</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5">{new Date(r.appliedDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 font-medium">{r.doctorName}</td>
                <td className="px-3 py-2.5">{r.consultantDate ? new Date(r.consultantDate).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2.5 text-fg-muted">{r.instruction ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Add Consultant" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending}>
        <div className="space-y-4">
          <Field label="Consultant Doctor" required><TextInput value={doctorName} onChange={(e) => setDoctorName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Applied Date" required><TextInput type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} /></Field>
            <Field label="Consultant Date"><TextInput type="date" value={consultantDate} onChange={(e) => setConsultantDate(e.target.value)} /></Field>
          </div>
          <Field label="Instruction"><TextArea value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
