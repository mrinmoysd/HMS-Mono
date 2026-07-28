'use client';

import { useState } from 'react';
import { Building2, ChevronLeft, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { branchSchema, type BranchDto } from '@smart-hospital/shared';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput } from '@/components/ui/field';
import { DurationSelect } from '@/components/ui/duration-select';
import { BranchPie } from '@/components/emr/branch-pie';
import {
  MULTI_BRANCH_REPORTS,
  useBranches, useBranchOverview, useCreateBranch, useDeleteBranch, useReport, useUpdateBranch,
} from '@/lib/hooks/use-admin';
import { useAbility } from '@/lib/auth-store';

type Tab = 'overview' | 'report' | 'settings';

export default function MultiBranchPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Building2 className="h-6 w-6 text-primary" /> Multi Branch</h1>
        <p className="text-sm text-fg-muted">Consolidated cross-branch overview, reports, and branch onboarding</p>
      </div>

      <Tabs tabs={[{ value: 'overview', label: 'Overview' }, { value: 'report', label: 'Report' }, { value: 'settings', label: 'Settings' }]} value={tab} onChange={(t) => setTab(t as Tab)} />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'report' && <ReportTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function OverviewTab() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const overview = useBranchOverview(from, to);

  return (
    <div className="space-y-6">
      <DurationSelect onSearch={(f, t) => { setFrom(f); setTo(t); }} />

      {overview.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}

      {(overview.data?.sections ?? []).map((section) => (
        <div key={section.key} className="rounded-md border border-border bg-surface p-4">
          <h3 className="mb-3 font-medium">{section.title}</h3>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                    <th className="px-3 py-2 font-semibold">Branch</th>
                    {section.columns.map((c) => <th key={c.key} className="px-3 py-2 font-semibold">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.branchId} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{row.branchName}</td>
                      {section.columns.map((c) => {
                        const v = row.values[c.key] ?? 0;
                        const isMoney = c.label.includes('($)');
                        return <td key={c.key} className="px-3 py-2 tabular">{isMoney ? v.toFixed(2) : v}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 lg:pl-4">
              <BranchPie rows={section.rows} metricKey={section.pieMetric} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportTab() {
  const [selected, setSelected] = useState<{ key: string; label: string } | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const report = useReport(selected?.key ?? null, from, to);

  function exportCsv() {
    if (!report.data) return;
    const header = report.data.columns.join(',');
    const body = report.data.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${selected?.key}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!selected) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MULTI_BRANCH_REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setSelected(r)}
            className="flex items-center gap-2 rounded-md border border-border bg-surface p-4 text-left text-sm font-medium hover:border-primary hover:text-primary"
          >
            <Download className="h-4 w-4 text-fg-muted" /> {r.label}
          </button>
        ))}
      </div>
    );
  }

  const d = report.data;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => setSelected(null)} className="mb-1 flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> All reports</button>
          <h1 className="text-xl font-semibold">{d?.title ?? selected.label}</h1>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!d || d.rows.length === 0}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
        <div className="w-44"><Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
        <div className="w-44"><Field label="To"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
        {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}
      </div>

      {d?.summary && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(d.summary).map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-surface px-4 py-2">
              <p className="text-xs text-fg-muted">{k}</p>
              <p className="text-lg font-semibold tabular">{typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              {(d?.columns ?? []).map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.isLoading && <tr><td colSpan={d?.columns.length ?? 1} className="px-3 py-10 text-center text-fg-muted">Loading…</td></tr>}
            {d && d.rows.length === 0 && <tr><td colSpan={d.columns.length} className="px-3 py-12 text-center text-fg-muted">No data for this period</td></tr>}
            {d?.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-bg/60">
                {row.map((cell, j) => <td key={j} className={`px-3 py-2 ${typeof cell === 'number' ? 'tabular' : ''}`}>{typeof cell === 'number' && !Number.isInteger(cell) ? cell.toFixed(2) : cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const ability = useAbility();
  const canAdd = ability.can('multi_branch', 'add');
  const canEdit = ability.can('multi_branch', 'edit');
  const canDelete = ability.can('multi_branch', 'delete');

  const branches = useBranches();
  const create = useCreateBranch();
  const update = useUpdateBranch();
  const del = useDeleteBranch();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDto | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function openAdd() { setEditing(null); setName(''); setUrl(''); setErr(null); setOpen(true); }
  function openEdit(b: BranchDto) { setEditing(b); setName(b.name); setUrl(b.url ?? ''); setErr(null); setOpen(true); }

  async function save() {
    setErr(null);
    const parsed = branchSchema.safeParse({ name, url });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? 'Invalid'); return; }
    if (editing) await update.mutateAsync({ id: editing.id, input: parsed.data });
    else await create.mutateAsync(parsed.data);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canAdd && <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add New Branch</Button>}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 font-semibold">Branch</th>
              <th className="px-3 py-2.5 font-semibold">URL</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {(branches.data ?? []).map((b) => (
              <tr key={b.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{b.name}{b.isHome && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Home</span>}</td>
                <td className="px-3 py-2.5">{b.url ? <a href={b.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{b.url}</a> : '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <button onClick={() => openEdit(b)} aria-label="Edit" title="Edit" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && !b.isHome && (
                      <button
                        onClick={async () => { if (confirm(`Delete branch "${b.name}"?`)) await del.mutateAsync(b.id); }}
                        aria-label="Delete" title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {branches.data && <p className="px-3 py-2.5 text-xs text-fg-muted">Records: 1 to {branches.data.length} of {branches.data.length}</p>}
      </div>

      <FormDrawer open={open} title={editing ? 'Edit Branch' : 'Add New Branch'} onClose={() => setOpen(false)} onSubmit={save} submitting={create.isPending || update.isPending}>
        {err && <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
        <div className="space-y-4">
          <Field label="Branch Name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="URL"><TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
        </div>
      </FormDrawer>
    </div>
  );
}
