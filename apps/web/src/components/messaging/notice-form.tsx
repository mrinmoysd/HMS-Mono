'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { CalendarClock, ChevronLeft, Send, Users } from 'lucide-react';
import type { NoticeDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { RichText } from '@/components/ui/rich-text';
import { useAuthStore } from '@/lib/auth-store';
import { useStaffRoles } from '@/lib/hooks/use-hr';
import { useCreateNotice, useUpdateNotice } from '@/lib/hooks/use-messaging';

export function NoticeForm({ editing, onBack }: { editing: NoticeDto | null; onBack: () => void }) {
  const me = useAuthStore((s) => s.user);
  const roles = useStaffRoles();
  const create = useCreateNotice();
  const update = useUpdateNotice();

  const [title, setTitle] = useState(editing?.subject ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [noticeDate, setNoticeDate] = useState(editing?.noticeDate ? editing.noticeDate.slice(0, 10) : '');
  const [publishOn, setPublishOn] = useState(editing?.publishOn ? editing.publishOn.slice(0, 10) : '');
  const [selected, setSelected] = useState<Set<string>>(new Set(editing ? editing.roles : (me?.roleLabel ? [me.roleLabel] : [])));
  const [error, setError] = useState('');

  const roleOptions = (roles.data ?? []).map((r) => r.label);
  function toggle(label: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  }

  async function save() {
    if (!title.trim() || !body.replace(/<[^>]*>/g, '').trim() || !noticeDate || !publishOn) { setError('Title, Message, Notice Date and Publish On are required.'); return; }
    const input = { subject: title, body, noticeDate: new Date(noticeDate), publishOn: new Date(publishOn), roles: [...selected] };
    if (editing) await update.mutateAsync({ id: editing.id, input });
    else await create.mutateAsync(input);
    onBack();
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Notice Board</button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: title + message */}
        <div className="rounded-md border border-border bg-surface lg:col-span-2">
          <div className="border-b border-border px-5 py-3 text-base font-semibold">{editing ? 'Edit Message' : 'Compose New Message'}</div>
          <div className="space-y-4 p-5">
            {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <Field label="Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title..." /></Field>
            <Field label="Message" required>
              <div className="rounded-sm border border-border"><RichText key={editing?.id ?? 'new'} value={body} onChange={setBody} /></div>
            </Field>
          </div>
        </div>

        {/* Right: dates + recipients + send */}
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" /> Notice Date &amp; Publish On</div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Field label="Notice Date" required><TextInput type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} /></Field>
              <Field label="Publish On" required><TextInput type="date" value={publishOn} onChange={(e) => setPublishOn(e.target.value)} /></Field>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Message To</div>
            <div className="divide-y divide-border/60">
              {roleOptions.map((label) => (
                <label key={label} className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm ${selected.has(label) ? 'bg-primary/5' : ''}`}>
                  <span className="flex items-center gap-2">
                    <Checkbox checked={selected.has(label)} onChange={() => toggle(label)} />
                    {label}
                  </span>
                  {me?.roleLabel === label && <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">You</span>}
                </label>
              ))}
            </div>
          </div>

          <Button className="w-full" loading={create.isPending || update.isPending} onClick={save}><Send className="h-4 w-4" /> Send</Button>
        </div>
      </div>
    </div>
  );
}
