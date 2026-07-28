'use client';

import { useState } from 'react';
import { Plus, Video, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import { useLiveConsults, useCreateLiveConsult, useUpdateLiveConsultStatus } from '@/lib/hooks/use-operations-clinical';
import type { EncounterScope } from '@/lib/hooks/use-diagnostics-clinical';

const STATUS_STYLE: Record<string, string> = {
  awaited: 'bg-warning/15 text-warning',
  finished: 'bg-success/15 text-success',
};

/** Live Consultation tab: schedule a tele-consult, join, and mark Awaited/Finished. */
export function LiveConsultTab({ scope, canEdit }: { scope: EncounterScope; canEdit: boolean }) {
  const { data: list = [] } = useLiveConsults(scope);
  const create = useCreateLiveConsult(scope);
  const setStatus = useUpdateLiveConsultStatus(scope);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [joinUrl, setJoinUrl] = useState('');

  async function save() {
    if (!title.trim()) return;
    await create.mutateAsync({
      patientId: scope.patientId,
      encounterType: scope.encounterType,
      encounterId: scope.encounterId,
      title,
      doctorName: doctorName || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      joinUrl: joinUrl || undefined,
    });
    setOpen(false);
    setTitle(''); setDoctorName(''); setJoinUrl('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Consultation</h2>
        {canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Start Consultation</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Title</th>
              <th className="px-3 py-2.5 font-semibold">Created For</th>
              <th className="px-3 py-2.5 font-semibold">Scheduled</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-fg-muted">No live consultations</td></tr>}
            {list.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.title}</td>
                <td className="px-3 py-2.5">{c.doctorName ?? '—'}</td>
                <td className="px-3 py-2.5">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[c.status] ?? 'bg-border/60 text-fg-muted'}`}>{c.status}</span></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-3">
                    {c.joinUrl && <a href={c.joinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Video className="h-3.5 w-3.5" /> Join</a>}
                    {canEdit && c.status !== 'finished' && (
                      <button onClick={() => setStatus.mutate({ id: c.id, input: { status: 'finished' } })} className="flex items-center gap-1 text-xs text-success hover:underline"><CheckCircle2 className="h-3.5 w-3.5" /> Finish</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer open={open} title="Start Live Consultation" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        <div className="space-y-4">
          <Field label="Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow-up tele-consult" /></Field>
          <Field label="Created For (Doctor)"><TextInput value={doctorName} onChange={(e) => setDoctorName(e.target.value)} /></Field>
          <Field label="Scheduled At"><TextInput type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
          <Field label="Join URL"><TextInput value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="https://…" /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
