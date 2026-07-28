'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { CalendarDays, KeyRound, Mail, MessageSquare, Pencil, Plus, Trash2, User } from 'lucide-react';
import type { NoticeDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { useAbility } from '@/lib/auth-store';
import { useNotices, useDeleteNotice } from '@/lib/hooks/use-messaging';
import { NoticeForm } from '@/components/messaging/notice-form';
import { SmsView, EmailView } from '@/components/messaging/send-views';
import { CredentialView } from '@/components/messaging/credential-view';

type View = 'board' | 'compose' | 'edit' | 'sms' | 'email' | 'credential';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

export default function MessagingPage() {
  const ability = useAbility();
  const canAdd = ability.can('messaging', 'add');
  const canEdit = ability.can('messaging', 'edit');
  const canDelete = ability.can('messaging', 'delete');

  const [view, setView] = useState<View>('board');
  const [editing, setEditing] = useState<NoticeDto | null>(null);
  const list = useNotices();
  const del = useDeleteNotice();
  const toast = useToast();
  const confirm = useConfirm();

  const back = () => { setView('board'); setEditing(null); };

  if (view === 'compose' || view === 'edit') return <NoticeForm editing={view === 'edit' ? editing : null} onBack={back} />;
  if (view === 'sms') return <SmsView onBack={back} />;
  if (view === 'email') return <EmailView onBack={back} />;
  if (view === 'credential') return <CredentialView onBack={back} />;

  const notices = list.data?.data ?? [];
  async function remove(n: NoticeDto) {
    const ok = await confirm({
      title: `Delete notice ${n.subject}?`,
      description: 'The notice is removed from the board for every recipient role.',
      confirmLabel: 'Delete notice',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(n.id);
      toast.success(`Notice deleted`);
    } catch (e) {
      toast.error('Could not delete notice', { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notice Board"
        actions={canAdd && (
          <>
            <Button onClick={() => { setEditing(null); setView('compose'); }}><Plus className="h-4 w-4" /> Post New Message</Button>
            <Button variant="secondary" onClick={() => setView('sms')}><MessageSquare className="h-4 w-4" /> Send SMS</Button>
            <Button variant="secondary" onClick={() => setView('email')}><Mail className="h-4 w-4" /> Send Email</Button>
            <Button variant="secondary" onClick={() => setView('credential')}><KeyRound className="h-4 w-4" /> Send Credential</Button>
          </>
        )}
      />

      <div className="space-y-3">
        {notices.map((n) => (
          <div key={n.id} className="rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-bg/50 px-5 py-3">
              <p className="font-semibold">{n.subject}</p>
              <div className="flex gap-1">
                {canEdit && <button onClick={() => { setEditing(n); setView('edit'); }} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm border border-border text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
                {canDelete && <button onClick={() => remove(n)} aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm border border-border text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
            <div className="space-y-4 p-5">
              {n.body && <div className="prose-sm max-w-none text-sm text-fg [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: n.body }} />}
              <div className="flex flex-wrap gap-x-10 gap-y-3 rounded-md bg-bg/50 p-4 text-sm">
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-fg-muted"><CalendarDays className="h-3.5 w-3.5" /> Publish Date</p>
                  <p className="mt-1 font-medium">{fmtDate(n.publishOn)}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-fg-muted"><CalendarDays className="h-3.5 w-3.5" /> Notice Date</p>
                  <p className="mt-1 font-medium">{fmtDate(n.noticeDate)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-fg-muted">Message To</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {n.roles.length === 0 ? <span className="text-fg-muted">—</span> : n.roles.map((r) => (
                      <span key={r} className="flex items-center gap-1 rounded-sm bg-border/50 px-2 py-0.5 text-xs"><User className="h-3 w-3" /> {r}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {list.data && notices.length === 0 && <p className="rounded-md border border-border bg-surface p-10 text-center text-sm text-fg-muted">No messages posted yet.</p>}
      </div>
    </div>
  );
}
