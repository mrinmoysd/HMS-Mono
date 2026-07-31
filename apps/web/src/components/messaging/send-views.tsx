'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { ChevronLeft, Paperclip, Send, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextInput, TextArea } from '@/components/ui/field';
import { RichText } from '@/components/ui/rich-text';
import { PatientSelect } from '@/components/patient-select';
import { useStaffRoles } from '@/lib/hooks/use-hr';
import { useSendSms, useSendEmail } from '@/lib/hooks/use-messaging';

/** Group/Individual segmented toggle + role checklist (right column shared by SMS/Email). */
function Recipients({ mode, setMode, selected, toggle, patientId, setPatient }: {
  mode: 'group' | 'individual'; setMode: (m: 'group' | 'individual') => void;
  selected: Set<string>; toggle: (r: string) => void;
  patientId: string; setPatient: (id: string, label: string) => void;
}) {
  const roles = useStaffRoles();
  const options = ['Patient', ...(roles.data ?? []).map((r) => r.label)];
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Message To <span className="text-danger">*</span></p>
      {mode === 'individual' ? (
        <PatientSelect value={patientId} onChange={setPatient} />
      ) : (
        <div className="rounded-md border border-border">
          {options.map((label) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm last:border-0">
              <Checkbox checked={selected.has(label)} onChange={() => toggle(label)} /> {label}
            </label>
          ))}
        </div>
      )}
      {/* Group/Individual toggle lives in the header; keep setMode referenced */}
      <input type="hidden" value={mode} onChange={() => setMode(mode)} />
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: 'group' | 'individual'; setMode: (m: 'group' | 'individual') => void }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <button onClick={() => setMode('group')} className={`flex items-center gap-1.5 border-b-2 pb-1 ${mode === 'group' ? 'border-primary font-medium text-primary' : 'border-transparent text-fg-muted'}`}><Users className="h-4 w-4" /> Group</button>
      <button onClick={() => setMode('individual')} className={`flex items-center gap-1.5 border-b-2 pb-1 ${mode === 'individual' ? 'border-primary font-medium text-primary' : 'border-transparent text-fg-muted'}`}><User className="h-4 w-4" /> Individual</button>
    </div>
  );
}

export function SmsView({ onBack }: { onBack: () => void }) {
  const send = useSendSms();
  const [mode, setMode] = useState<'group' | 'individual'>('group');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [through, setThrough] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState('');
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  function toggleThrough(v: string) { setThrough((p) => { const n = new Set(p); if (n.has(v)) n.delete(v); else n.add(v); return n; }); }
  async function save() {
    setError('');
    if (!subject.trim() || !message.trim() || through.size === 0) { setError('Title, Send Through and Message are required.'); return; }
    await send.mutateAsync({ mode, subject, message, templateId, sendThrough: [...through] as ('sms' | 'mobile_app')[], roles: [...selected], patientId: patientId || null });
    setOk(true);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Notice Board</button>
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h1 className="text-lg font-semibold">Send SMS</h1>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        {ok ? (
          <p className="m-5 rounded-sm bg-success/10 px-3 py-2 text-sm text-success">SMS queued for delivery.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <Field label="Title" required><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
              <Field label="Template Id"><TextInput value={templateId} onChange={(e) => setTemplateId(e.target.value)} /><p className="mt-1 text-xs text-danger">This field required only for Indian SMS Gateway</p></Field>
              <div>
                <p className="mb-1 text-sm font-medium">Send Through <span className="text-danger">*</span></p>
                <div className="flex gap-6 text-sm">
                  <Checkbox label="SMS" checked={through.has('sms')} onChange={() => toggleThrough('sms')} />
                  <Checkbox label="Mobile App" checked={through.has('mobile_app')} onChange={() => toggleThrough('mobile_app')} />
                </div>
              </div>
              <Field label="Message" required>
                <TextArea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
                <p className="mt-1 text-xs text-fg-muted">Character Count: {message.length}</p>
              </Field>
            </div>
            <Recipients mode={mode} setMode={setMode} selected={selected} toggle={(r) => setSelected((p) => { const n = new Set(p); if (n.has(r)) n.delete(r); else n.add(r); return n; })} patientId={patientId} setPatient={(id) => setPatientId(id)} />
          </div>
        )}
        {!ok && <div className="flex justify-end border-t border-border px-5 py-3"><Button loading={send.isPending} onClick={save}><Send className="h-4 w-4" /> Send</Button></div>}
      </div>
    </div>
  );
}

export function EmailView({ onBack }: { onBack: () => void }) {
  const send = useSendEmail();
  const [mode, setMode] = useState<'group' | 'individual'>('group');
  const [subject, setSubject] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState('');
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachmentUrl(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function save() {
    setError('');
    if (!subject.trim() || !message.replace(/<[^>]*>/g, '').trim()) { setError('Title and Message are required.'); return; }
    await send.mutateAsync({ mode, subject, message, attachmentUrl, roles: [...selected], patientId: patientId || null });
    setOk(true);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Notice Board</button>
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h1 className="text-lg font-semibold">Send Email</h1>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        {ok ? (
          <p className="m-5 rounded-sm bg-success/10 px-3 py-2 text-sm text-success">Email queued for delivery.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <Field label="Title" required><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
              <Field label="Attachment">
                <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-sm text-fg-muted hover:border-primary hover:text-primary">
                  <Paperclip className="h-4 w-4" /> {attachmentUrl ? 'File attached — replace' : 'Drop a file here or click'}
                  <input type="file" className="hidden" onChange={onFile} />
                </label>
              </Field>
              <Field label="Message" required>
                <div className="rounded-sm border border-border"><RichText value={message} onChange={setMessage} /></div>
              </Field>
            </div>
            <Recipients mode={mode} setMode={setMode} selected={selected} toggle={(r) => setSelected((p) => { const n = new Set(p); if (n.has(r)) n.delete(r); else n.add(r); return n; })} patientId={patientId} setPatient={(id) => setPatientId(id)} />
          </div>
        )}
        {!ok && <div className="flex justify-end border-t border-border px-5 py-3"><Button loading={send.isPending} onClick={save}><Send className="h-4 w-4" /> Send</Button></div>}
      </div>
    </div>
  );
}
