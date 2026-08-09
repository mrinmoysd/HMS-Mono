'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  unknownPlaceholders,
  type SystemNotificationEventConfig,
  type SystemNotificationEventDef,
} from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import {
  useSaveSystemNotificationSettings,
  useSystemNotificationSettings,
} from '@/lib/hooks/use-settings';

export default function SystemNotificationSettingPage() {
  const { data, isLoading } = useSystemNotificationSettings();
  const save = useSaveSystemNotificationSettings();
  const toast = useToast();

  const [draft, setDraft] = useState<Record<string, SystemNotificationEventConfig> | null>(null);
  useEffect(() => {
    if (!data) return;
    const seeded: Record<string, SystemNotificationEventConfig> = {};
    for (const e of data.events) {
      seeded[e.key] = data.config[e.key] ?? {
        enabled: false,
        toStaff: true,
        toPatient: false,
        subject: e.defaultSubject,
        body: e.defaultBody,
      };
    }
    setDraft(seeded);
  }, [data]);

  const problems = useMemo(() => {
    if (!data || !draft) return [];
    const out: string[] = [];
    for (const e of data.events) {
      const cfg = draft[e.key];
      if (!cfg) continue;
      for (const field of ['subject', 'body'] as const) {
        const bad = unknownPlaceholders(cfg[field], e.placeholders);
        if (bad.length) out.push(`${e.label} ${field}: ${bad.map((b) => `{{${b}}}`).join(', ')}`);
      }
    }
    return out;
  }, [data, draft]);

  if (isLoading || !data || !draft) return <Skeleton className="h-96 w-full" />;

  const set = (key: string, patch: Partial<SystemNotificationEventConfig>) =>
    setDraft((d) => (d ? { ...d, [key]: { ...d[key]!, ...patch } } : d));

  const enabledCount = Object.values(draft).filter((c) => c.enabled).length;

  async function onSave() {
    if (!draft) return;
    if (problems.length) {
      toast.error('Fix the unknown placeholders first');
      return;
    }
    try {
      await save.mutateAsync({ events: draft });
      toast.success('System notifications saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="System Notification Setting"
        description="Internal events, who they reach, and what they say."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          These are in-app notices raised by the hospital&apos;s own activity. Staff and Patient
          decide who sees each one — a stock warning belongs to staff, an invoice notice may go to
          both.
        </span>
      </div>

      {problems.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">These placeholders cannot be filled for their event:</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-medium">Events</h2>
          <span className="text-xs text-fg-muted">
            {enabledCount} of {data.events.length} enabled
          </span>
        </div>
        <ul className="divide-y divide-border">
          {data.events.map((event) => (
            <EventRow
              key={event.key}
              event={event}
              config={draft[event.key]!}
              onChange={(patch) => set(event.key, patch)}
            />
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onSave} disabled={save.isPending || problems.length > 0}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function EventRow({
  event,
  config,
  onChange,
}: {
  event: SystemNotificationEventDef;
  config: SystemNotificationEventConfig;
  onChange: (patch: Partial<SystemNotificationEventConfig>) => void;
}) {
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{event.label}</p>
        <div className="flex items-center gap-5">
          <Checkbox
            checked={config.toStaff}
            onChange={(e) => onChange({ toStaff: e.target.checked })}
            label="Staff"
            disabled={!config.enabled}
          />
          <Checkbox
            checked={config.toPatient}
            onChange={(e) => onChange({ toPatient: e.target.checked })}
            label="Patient"
            disabled={!config.enabled}
          />
          <Switch checked={config.enabled} onChange={(v) => onChange({ enabled: v })} />
        </div>
      </div>

      {/*
        The body only matters once the event is on. Collapsing it keeps a
        nine-row table readable instead of nine stacked textareas.
      */}
      {config.enabled && (
        <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
          <Field label="Subject">
            <TextInput
              value={config.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
            />
          </Field>
          <Field label="Message">
            <TextArea rows={2} value={config.body} onChange={(e) => onChange({ body: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {event.placeholders.map((p) => (
              <span
                key={p}
                className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-fg-muted"
              >
                {`{{${p}}}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
