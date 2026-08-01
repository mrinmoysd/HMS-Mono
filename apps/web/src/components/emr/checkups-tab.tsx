'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { opdCheckupSchema, type OpdCheckupDto } from '@smart-hospital/shared';
import { Button, IconButton } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import {
  useDoctors,
  useOpdCheckups,
  useCreateOpdCheckup,
  useUpdateOpdCheckup,
  useDeleteOpdCheckup,
} from '@/lib/hooks/use-clinical';

/**
 * The OPD visit's "Visits" tab (blueprint §7.3 tab 2).
 *
 * A visit is the episode; each checkup is the patient actually being seen. A
 * follow-up on the same episode is a new checkup here rather than a new visit,
 * which is what keeps one visit's charges and bills together under one Case ID.
 */
export function CheckupsTab({
  visitId,
  opdNo,
  defaultConsultantId,
  canEdit,
}: {
  visitId: string;
  opdNo: string;
  defaultConsultantId?: string;
  canEdit: boolean;
}) {
  const { data: checkups = [], isLoading } = useOpdCheckups(visitId);
  const { data: doctors = [] } = useDoctors();
  const create = useCreateOpdCheckup(visitId);
  const update = useUpdateOpdCheckup(visitId);
  const del = useDeleteOpdCheckup(visitId);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OpdCheckupDto | null>(null);
  const [date, setDate] = useState('');
  const [consultantId, setConsultantId] = useState('');
  const [reference, setReference] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [findings, setFindings] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // A new checkup defaults to today and to the visit's own consultant, which
  // is right far more often than not — a recheck is usually the same doctor.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.appointmentDate.slice(0, 10));
      setConsultantId(editing.consultantId);
      setReference(editing.reference ?? '');
      setSymptoms(editing.symptoms ?? '');
      setFindings(editing.findings ?? '');
      setNote(editing.note ?? '');
    } else {
      setDate(localToday());
      setConsultantId(defaultConsultantId ?? '');
      setReference(''); setSymptoms(''); setFindings(''); setNote('');
    }
    setError(null);
  }, [open, editing, defaultConsultantId]);

  async function save() {
    setError(null);
    const parsed = opdCheckupSchema.safeParse({
      appointmentDate: date,
      consultantId,
      reference,
      symptoms,
      findings,
      note,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: parsed.data });
      else await create.mutateAsync(parsed.data);
      setOpen(false);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDelete(c: OpdCheckupDto) {
    if (!(await confirmDelete(`checkup ${c.checkupNo}`))) return;
    try {
      await del.mutateAsync(c.id);
      toast.success(`${c.checkupNo} removed`);
    } catch (e) {
      toast.error('Could not remove checkup', { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Checkups <span className="text-fg-muted">{opdNo}</span>
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Checkup
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">OPD Checkup ID</th>
              <th className="px-3 py-2.5 font-semibold">Appointment Date</th>
              <th className="px-3 py-2.5 font-semibold">Consultant</th>
              <th className="px-3 py-2.5 font-semibold">Reference</th>
              <th className="px-3 py-2.5 font-semibold">Symptoms</th>
              <th className="w-24 px-3 py-2.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-fg-muted">Loading…</td></tr>
            )}
            {!isLoading && checkups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8">
                  <EmptyState title="No checkups yet" description="Add the first consultation on this visit." />
                </td>
              </tr>
            )}
            {checkups.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.checkupNo}</td>
                <td className="px-3 py-2.5">{new Date(c.appointmentDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5">{c.consultantName}</td>
                <td className="px-3 py-2.5 text-fg-muted">{c.reference ?? '—'}</td>
                <td className="px-3 py-2.5 text-fg-muted">{c.symptoms ?? '—'}</td>
                <td className="px-3 py-2.5">
                  {canEdit && (
                    <div className="flex gap-1">
                      <IconButton label="Edit checkup" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Delete checkup" tone="danger" size="sm" onClick={() => onDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer
        open={open}
        title={editing ? `Edit ${editing.checkupNo}` : 'New Checkup'}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={save}
        submitting={create.isPending || update.isPending}
      >
        {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Appointment Date" required>
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Consultant" required>
              <Select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                placeholder="Select…"
                options={doctors.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Field>
          </div>
          <Field label="Reference">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Symptoms">
            <TextArea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} />
          </Field>
          <Field label="Findings">
            <TextArea value={findings} onChange={(e) => setFindings(e.target.value)} rows={2} />
          </Field>
          <Field label="Note">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}

/** yyyy-mm-dd for *today* in local time — never toISOString, which is UTC. */
function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
