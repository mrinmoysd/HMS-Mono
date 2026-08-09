'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  renderTemplate,
  unknownPlaceholders,
  type NotificationChannel,
  type NotificationEventConfig,
  type NotificationEventDef,
} from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { hospitalSettings } from '@/lib/hospital-settings';
import { useNotificationSettings, useSaveNotificationSettings } from '@/lib/hooks/use-settings';

const BLANK: NotificationEventConfig = {
  channels: [],
  templateId: '',
  whatsappTemplateId: '',
  subject: '',
  body: '',
};

export default function NotificationSettingPage() {
  const { data, isLoading } = useNotificationSettings();
  const save = useSaveNotificationSettings();
  const toast = useToast();

  const [draft, setDraft] = useState<Record<string, NotificationEventConfig> | null>(null);
  useEffect(() => {
    if (!data) return;
    // An event with no stored row starts from its shipped default, so the
    // admin edits real text rather than an empty box.
    const seeded: Record<string, NotificationEventConfig> = {};
    for (const e of data.events) {
      seeded[e.key] = data.config[e.key] ?? {
        ...BLANK,
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

  const set = (key: string, patch: Partial<NotificationEventConfig>) =>
    setDraft((d) => (d ? { ...d, [key]: { ...d[key]!, ...patch } } : d));

  async function onSave() {
    if (!draft) return;
    if (problems.length) {
      toast.error('Fix the unknown placeholders first');
      return;
    }
    try {
      await save.mutateAsync({ events: draft });
      toast.success('Notification settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Notification Setting"
        description="Which events reach patients and staff, through which channel, and what they say."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Every event here is raised by something the product actually does — there are no rows for
          events that would never fire. Ticking a channel records the intent; the gateway that
          delivers it is configured in SMS, WhatsApp and Email Setting.
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

      {data.events.map((event) => (
        <EventCard
          key={event.key}
          event={event}
          config={draft[event.key]!}
          onChange={(patch) => set(event.key, patch)}
        />
      ))}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onSave} disabled={save.isPending || problems.length > 0}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function EventCard({
  event,
  config,
  onChange,
}: {
  event: NotificationEventDef;
  config: NotificationEventConfig;
  onChange: (patch: Partial<NotificationEventConfig>) => void;
}) {
  const toggle = (c: NotificationChannel, on: boolean) =>
    onChange({
      channels: on ? [...new Set([...config.channels, c])] : config.channels.filter((x) => x !== c),
    });

  // A preview built from the event's own placeholder list, so the admin sees
  // the shape of the real message before a patient does.
  const sample = useMemo(() => {
    const s = hospitalSettings();
    const ctx: Record<string, string> = {
      hospital_name: s.hospitalName,
      hospital_phone: s.phone,
      hospital_email: s.email,
    };
    for (const p of event.placeholders) {
      if (!(p in ctx)) ctx[p] = `[${p.replace(/_/g, ' ')}]`;
    }
    return renderTemplate(config.body, ctx).text;
  }, [config.body, event.placeholders]);

  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-medium">{event.label}</h2>
        <span className="text-xs text-fg-muted">{event.raisedBy}</span>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-4">
          {NOTIFICATION_CHANNELS.map((c) => (
            <Checkbox
              key={c}
              checked={config.channels.includes(c)}
              onChange={(e) => toggle(c, e.target.checked)}
              label={CHANNEL_LABELS[c]}
            />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Template Id">
            <TextInput
              value={config.templateId}
              onChange={(e) => onChange({ templateId: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp Template Id">
            <TextInput
              value={config.whatsappTemplateId}
              onChange={(e) => onChange({ whatsappTemplateId: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Subject">
          <TextInput value={config.subject} onChange={(e) => onChange({ subject: e.target.value })} />
        </Field>

        <Field label="Message">
          <TextArea rows={3} value={config.body} onChange={(e) => onChange({ body: e.target.value })} />
        </Field>

        <div>
          <p className="mb-1 text-xs text-fg-muted">Available placeholders — click to copy</p>
          <div className="flex flex-wrap gap-1.5">
            {event.placeholders.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => navigator.clipboard?.writeText(`{{${p}}}`)}
                className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-fg-muted hover:border-primary hover:text-primary"
              >
                {`{{${p}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-border bg-bg p-3">
          <p className="mb-1 flex items-center gap-2 text-xs text-fg-muted">
            Preview <Badge tone="neutral">sample values</Badge>
          </p>
          <p className="text-sm">{sample || <span className="text-fg-subtle">Nothing to preview</span>}</p>
        </div>
      </div>
    </section>
  );
}
