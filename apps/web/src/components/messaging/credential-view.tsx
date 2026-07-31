'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useMemo, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { CREDENTIAL_TYPES, type PatientCredentialDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { usePatientCredentials, useSendCredential } from '@/lib/hooks/use-messaging';

export function CredentialView({ onBack }: { onBack: () => void }) {
  const list = usePatientCredentials();
  const send = useSendCredential();
  const [credentialType, setCredentialType] = useState<'login' | 'forgot' | 'both'>('login');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ok, setOk] = useState('');

  const rows = useMemo(() => {
    const all = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => `${p.name} ${p.patientNo} ${p.username}`.toLowerCase().includes(q)) : all;
  }, [list.data, search]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected((prev) => { const n = new Set(prev); if (allChecked) rows.forEach((r) => n.delete(r.id)); else rows.forEach((r) => n.add(r.id)); return n; });
  }
  function toggle(id: string) { setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  async function submit() {
    if (selected.size === 0) return;
    const res = await send.mutateAsync({ credentialType, patientIds: [...selected] });
    setOk(`Credentials sent to ${res.sent} patient(s).`);
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> Notice Board</button>
      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-5 py-3 text-lg font-semibold">Send Patient Credential</div>
        <div className="space-y-4 p-5">
          {ok && <p role="status" className="rounded-sm bg-success/10 px-3 py-2 text-sm text-success">{ok}</p>}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-72"><Field label="Credential Type" required>
              <Select value={credentialType} onChange={(e) => setCredentialType(e.target.value as 'login' | 'forgot' | 'both')}
                options={CREDENTIAL_TYPES.map((c) => ({ value: c.value, label: c.label }))} />
            </Field></div>
            <div className="flex items-center gap-2">
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-56" />
              <ExportMenu table={() => ({ title: 'Patient Credentials', filename: 'patient-credentials', headers: ['Patient Id', 'Patient Name', 'Email', 'Mobile Number', 'Username', 'Password'], rows: rows.map((p) => [p.patientNo, p.name, p.email ?? '', p.phone ?? '', p.username, p.password]) })} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-3 py-2.5"><Checkbox checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
                  {['Patient Id', 'Patient Name', 'Email', 'Mobile Number', 'Username', 'Password'].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((p: PatientCredentialDto) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2.5"><Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label="Select row" /></td>
                    <td className="px-3 py-2.5 font-medium">{p.patientNo}</td>
                    <td className="px-3 py-2.5">{p.name}</td>
                    <td className="px-3 py-2.5">{p.email || '—'}</td>
                    <td className="px-3 py-2.5">{p.phone || '—'}</td>
                    <td className="px-3 py-2.5">{p.username}</td>
                    <td className="px-3 py-2.5 tabular">{p.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
            {!list.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">No patients found.</p>}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-sm text-fg-muted">{selected.size} selected</span>
          <Button disabled={selected.size === 0} loading={send.isPending} onClick={submit}><Send className="h-4 w-4" /> Send Credential</Button>
        </div>
      </div>
    </div>
  );
}
