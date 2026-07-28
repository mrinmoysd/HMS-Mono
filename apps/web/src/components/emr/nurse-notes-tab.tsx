'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { useNurseNotes, useAddNurseNote } from '@/lib/hooks/use-ipd-clinical';
import type { EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';

/** Nurse Notes tab (IPD): chronological nurse observations. */
export function NurseNotesTab({ scope, canEdit }: { scope: EncounterScope; canEdit: boolean }) {
  const { data: notes = [] } = useNurseNotes(scope);
  const add = useAddNurseNote(scope);
  const [open, setOpen] = useState(false);
  const [nurseName, setNurseName] = useState('');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');

  async function save() {
    if (!note.trim()) return;
    await add.mutateAsync({ patientId: scope.patientId, encounterType: scope.encounterType, encounterId: scope.encounterId, nurseName: nurseName || undefined, note, comment: comment || undefined });
    setOpen(false);
    setNurseName(''); setNote(''); setComment('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nurse Notes</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Note</Button>}
      </div>

      {notes.length === 0 && <div className="rounded-md border border-border bg-surface p-10 text-center text-sm text-fg-muted">No nurse notes</div>}
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span className="font-medium text-fg">{n.nurseName || n.createdByName || 'Nurse'}</span>
              <span>{new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <p className="mt-1 text-sm">{n.note}</p>
            {n.comment && <p className="mt-1 text-xs text-fg-muted">Comment: {n.comment}</p>}
          </div>
        ))}
      </div>

      <FormDrawer open={open} title="Add Nurse Note" onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending}>
        <div className="space-y-4">
          <Field label="Nurse Name"><TextInput value={nurseName} onChange={(e) => setNurseName(e.target.value)} /></Field>
          <Field label="Note" required><TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={4} /></Field>
          <Field label="Comment"><TextInput value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
