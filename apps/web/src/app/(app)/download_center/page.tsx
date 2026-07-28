'use client';

import { useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import type { ContentShareDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useContent, useCreateContent } from '@/lib/hooks/use-office';
import { useAbility } from '@/lib/auth-store';

export default function DownloadCenterPage() {
  const ability = useAbility();
  const canAdd = ability.can('download_center', 'add');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const content = useContent({ page, size: 25 });
  const types = useCatalog('content-type', { size: 100 });
  const create = useCreateContent();
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const cols: Column<ContentShareDto>[] = [
    { key: 'title', header: 'Title', className: 'font-medium' },
    { key: 'contentTypeName', header: 'Type', render: (c) => c.contentTypeName ?? '—' },
    { key: 'sendToGroup', header: 'Shared With', render: (c) => c.sendToGroup ?? '—' },
    { key: 'shareDate', header: 'Date', render: (c) => new Date(c.shareDate).toLocaleDateString() },
    { key: 'fileUrl', header: 'File', render: (c) => c.fileUrl ? <a href={c.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><ExternalLink className="h-3.5 w-3.5" /> Open</a> : '—' },
  ];

  async function save() {
    await create.mutateAsync({ title: f.title, contentTypeId: f.contentTypeId || null, sendToGroup: f.sendToGroup, fileUrl: f.fileUrl, description: f.description });
    setOpen(false); setF({});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Download Center</h1>
          <p className="text-sm text-fg-muted">Share documents with staff groups</p>
        </div>
        {canAdd && <Button onClick={() => { setF({}); setOpen(true); }}><Plus className="h-4 w-4" /> Upload / Share</Button>}
      </div>

      <DataTable columns={cols} rows={content.data?.data ?? []} meta={content.data?.meta} loading={content.isLoading} search="" onSearch={() => {}} onPage={setPage} onSize={() => {}} />

      <FormDrawer open={open} title="Share Content" onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending}>
        <div className="space-y-4">
          <Field label="Title" required><TextInput value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Content Type"><Select value={f.contentTypeId ?? ''} onChange={(e) => set('contentTypeId', e.target.value)} placeholder="Select…" options={(types.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
          <Field label="Share With (group)"><TextInput value={f.sendToGroup ?? ''} onChange={(e) => set('sendToGroup', e.target.value)} placeholder="Doctors, All Staff…" /></Field>
          <Field label="File URL"><TextInput value={f.fileUrl ?? ''} onChange={(e) => set('fileUrl', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Description"><TextArea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
