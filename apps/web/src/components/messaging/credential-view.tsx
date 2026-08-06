'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { CREDENTIAL_TYPES, type PatientCredentialDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Field, Select } from '@/components/ui/field';
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
    return q
      ? all.filter((p) => `${p.name} ${p.patientNo} ${p.username}`.toLowerCase().includes(q))
      : all;
  }, [list.data, search]);

  function toggle(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /** DataTable hands us the ids currently visible — respect the active filter. */
  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const n = new Set(prev);
      const allOn = ids.length > 0 && ids.every((id) => n.has(id));
      ids.forEach((id) => (allOn ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    const res = await send.mutateAsync({ credentialType, patientIds: [...selected] });
    setOk(`Credentials sent to ${res.sent} patient(s).`);
    setSelected(new Set());
  }

  const columns: Column<PatientCredentialDto>[] = [
    { key: 'patientNo', header: 'Patient Id', className: 'font-medium', alwaysVisible: true },
    { key: 'name', header: 'Patient Name' },
    { key: 'email', header: 'Email', render: (p) => p.email || '—' },
    { key: 'phone', header: 'Mobile Number', render: (p) => p.phone || '—' },
    { key: 'username', header: 'Username' },
    { key: 'password', header: 'Password', className: 'tabular' },
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" /> Notice Board
      </button>

      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-5 py-3 text-lg font-semibold">
          Send Patient Credential
        </div>

        <div className="space-y-4 p-5">
          {ok && (
            <p role="status" className="rounded-sm bg-success/10 px-3 py-2 text-sm text-success">
              {ok}
            </p>
          )}

          <div className="w-72">
            <Field label="Credential Type" required>
              <Select
                value={credentialType}
                onChange={(e) => setCredentialType(e.target.value as 'login' | 'forgot' | 'both')}
                options={CREDENTIAL_TYPES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </Field>
          </div>

          {/* Was a hand-rolled <table>. DataTable already does selection, and
              with it this list gains sorting, the column chooser and the same
              empty state as every other table in the app. */}
          <DataTable
            columns={columns}
            rows={rows}
            loading={list.isLoading}
            search={search}
            onSearch={setSearch}
            onPage={() => {}}
            onSize={() => {}}
            selectable
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            toolbar={
              <ExportMenu
                table={() => ({
                  title: 'Patient Credentials',
                  filename: 'patient-credentials',
                  headers: ['Patient Id', 'Patient Name', 'Email', 'Mobile Number', 'Username', 'Password'],
                  rows: rows.map((p) => [
                    p.patientNo, p.name, p.email ?? '', p.phone ?? '', p.username, p.password,
                  ]),
                })}
              />
            }
          />
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-sm text-fg-muted">{selected.size} selected</span>
          <Button disabled={selected.size === 0} loading={send.isPending} onClick={submit}>
            <Send className="h-4 w-4" /> Send Credential
          </Button>
        </div>
      </div>
    </div>
  );
}
