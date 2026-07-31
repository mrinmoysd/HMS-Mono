'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Plus, Trash2, Pencil, FileText, Paperclip } from 'lucide-react';
import type { TimelineEntryDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { useAddTimeline, useUpdateTimeline, useDeleteTimeline } from '@/lib/hooks/use-emr';

export function TimelineTab({ patientId, entries, canEdit, compact }: { patientId: string; entries: TimelineEntryDto[]; canEdit: boolean; compact?: boolean }) {
  const add = useAddTimeline(patientId);
  const update = useUpdateTimeline(patientId);
  const del = useDeleteTimeline(patientId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEntryDto | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [desc, setDesc] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [visible, setVisible] = useState(true);

  function openAdd() {
    setEditing(null);
    setTitle('');
    setDate(new Date().toISOString().slice(0, 16));
    setDesc('');
    setFileUrl('');
    setFileName('');
    setVisible(true);
    setOpen(true);
  }

  function openEdit(e: TimelineEntryDto) {
    setEditing(e);
    setTitle(e.title);
    setDate(new Date(e.date).toISOString().slice(0, 16));
    setDesc(e.description ?? '');
    setFileUrl(e.fileUrl ?? '');
    setFileName(e.fileUrl ? 'Attached document' : '');
    setVisible(e.visibleToPatient);
    setOpen(true);
  }

  function readFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileUrl(String(reader.result));
    reader.readAsDataURL(file);
    setFileName(file.name);
  }

  async function save() {
    if (!title.trim()) return;
    if (editing) {
      await update.mutateAsync({ id: editing.id, input: { title, date: new Date(date), description: desc, fileUrl, visibleToPatient: visible } });
    } else {
      await add.mutateAsync({ patientId, title, date: new Date(date), description: desc, fileUrl, visibleToPatient: visible });
    }
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timeline</h2>
          {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Timeline</Button>}
        </div>
      )}
      {compact && canEdit && (
        <button onClick={openAdd} className="text-sm font-medium text-primary">+ Add timeline</button>
      )}

      <ol className="relative space-y-4 border-l border-border pl-5">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg"><FileText className="h-3 w-3" /></span>
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-fg-muted">{new Date(e.date).toLocaleString()}</p>
                  <p className="font-medium text-primary">{e.title}</p>
                  {e.description && <p className="mt-0.5 text-sm text-fg-muted">{e.description}</p>}
                  {e.fileUrl && (
                    <a href={e.fileUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline">
                      <Paperclip className="h-3 w-3" /> Attached document
                    </a>
                  )}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => openEdit(e)} aria-label="Edit" className="text-fg-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del.mutate(e.id)} aria-label="Delete" className="text-fg-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="text-sm text-fg-muted">No timeline entries.</li>}
      </ol>

      <FormDrawer open={open} title={editing ? 'Edit Timeline' : 'Add Timeline'} onClose={() => setOpen(false)} onSubmit={save} submitting={add.isPending || update.isPending}>
        <div className="space-y-4">
          <Field label="Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Date" required><TextInput type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Description"><TextArea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Attach Document">
            <div className="flex items-center gap-3">
              <input type="file" onChange={(e) => readFile(e.target.files?.[0])} className="text-sm" />
              {fileUrl && (
                <button type="button" onClick={() => { setFileUrl(''); setFileName(''); }} className="text-xs text-danger">
                  Remove
                </button>
              )}
            </div>
            {fileName && <p className="mt-1 text-xs text-fg-muted">{fileName}</p>}
          </Field>
          <Checkbox label="Visible to this person" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        </div>
      </FormDrawer>
    </div>
  );
}
