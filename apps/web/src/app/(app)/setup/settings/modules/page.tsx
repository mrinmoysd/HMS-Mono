'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import type { ModuleToggleRow } from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useModules, useSaveModules } from '@/lib/hooks/use-settings';

export default function ModulesSettingPage() {
  const { data, isLoading } = useModules();
  const save = useSaveModules();
  const toast = useToast();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (data) setDraft(new Set(data.disabled));
  }, [data]);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const saved = new Set(data.disabled);
    if (saved.size !== draft.size) return true;
    for (const k of draft) if (!saved.has(k)) return true;
    return false;
  }, [data, draft]);

  if (isLoading || !data || !draft) return <Skeleton className="h-96 w-full" />;

  const offCount = draft.size;

  function toggle(key: string, on: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (on) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onSave() {
    if (!draft) return;
    const turningOff = [...draft].filter((k) => !data!.disabled.includes(k));
    if (turningOff.length > 0) {
      // Switching a module off hides it for everyone and denies its API, so
      // the count is worth saying out loud before it happens.
      const names = turningOff
        .map((k) => data!.rows.find((r) => r.key === k)?.label ?? k)
        .join(', ');
      const ok = await confirm({
        title: `Switch off ${turningOff.length} module${turningOff.length === 1 ? '' : 's'}?`,
        description:
          `${names}. Everyone loses access immediately, including administrators, ` +
          'and the screens disappear from the sidebar. Existing data is kept and ' +
          'returns when you switch the module back on.',
        confirmLabel: 'Switch off',
        tone: 'danger',
      });
      if (!ok) return;
    }
    try {
      await save.mutateAsync({ disabled: [...draft] });
      toast.success('Modules updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Modules"
        description="Switch a module off to remove it from this branch entirely."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Switching a module off is enforced by the API, not just the menu — a disabled module is
          refused for every role, administrators included. Nothing is deleted: switch it back on and
          the data is exactly as it was. A few modules cannot be switched off because doing so would
          lock you out of this screen.
        </span>
      </div>

      <section className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-medium">System modules</h2>
          <span className="text-xs text-fg-muted">
            {data.rows.length - offCount} on · {offCount} off
          </span>
        </div>
        <ul className="divide-y divide-border">
          {data.rows.map((row) => (
            <ModuleRow
              key={row.key}
              row={row}
              on={!draft.has(row.key)}
              onChange={(v) => toggle(row.key, v)}
            />
          ))}
        </ul>
      </section>

      {/*
        The reference has a second tab for the 14 patient-portal modules. We have
        a `patient` portal role but no portal screens yet, so there is nothing
        honest to list — the one patient-facing switch we do have is
        Patient Panel, on the General Setting page. This tab arrives with the
        portal, not before it.
      */}

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-sm text-fg-muted">Unsaved changes</span>}
        <Button onClick={onSave} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function ModuleRow({
  row,
  on,
  onChange,
}: {
  row: ModuleToggleRow;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm">
          <span className={row.toggleable ? '' : 'text-fg-muted'}>{row.label}</span>
          {row.reason === 'coming_soon' && <Badge tone="neutral">Coming soon</Badge>}
          {row.reason === 'protected' && (
            <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
              <Lock className="h-3 w-3" /> Always on
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {row.reason === 'coming_soon'
            ? 'Not built yet — listed so this stays a complete inventory.'
            : row.reason === 'protected'
              ? 'Switching this off would remove the screen that switches it back on.'
              : row.key}
        </p>
      </div>
      {row.toggleable ? (
        <Switch checked={on} onChange={onChange} />
      ) : (
        // Deliberately not a disabled Switch: a greyed toggle still reads as a
        // state you could change, and for coming-soon rows there is no state.
        <span className="text-xs text-fg-muted">—</span>
      )}
    </li>
  );
}
