'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send, ShieldAlert } from 'lucide-react';
import {
  CHANNEL_META,
  channelIsLive,
  defaultCredentials,
  providersFor,
  validateChannelSetting,
  type Channel,
  type ChannelSettingInput,
  type ChannelTestResult,
  type CredentialField,
  type ProviderConfig,
  type ProviderDef,
} from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useChannelSetting, useSaveChannelSetting, useTestChannel } from '@/lib/hooks/use-settings';

/**
 * One screen for SMS, WhatsApp and Email. They differ only in their provider
 * list, which the shared registry supplies — three near-identical pages would
 * be three places for the mask-preserving logic to be got subtly wrong.
 */
export function ChannelSettings({ channel }: { channel: Channel }) {
  const { data, isLoading } = useChannelSetting(channel);
  const save = useSaveChannelSetting(channel);
  const test = useTestChannel(channel);
  const toast = useToast();

  const [draft, setDraft] = useState<ChannelSettingInput | null>(null);
  const [tab, setTab] = useState<string>(providersFor(channel)[0]!.key);
  const [testTo, setTestTo] = useState('');
  const [result, setResult] = useState<ChannelTestResult | null>(null);

  useEffect(() => {
    if (!data) return;
    setDraft({ activeProvider: data.activeProvider, providers: data.providers });
    if (data.activeProvider) setTab(data.activeProvider);
  }, [data]);

  const problems = useMemo(
    () => (draft ? validateChannelSetting(channel, draft) : []),
    [channel, draft],
  );

  if (isLoading || !data || !draft) return <Skeleton className="h-96 w-full" />;

  const meta = CHANNEL_META[channel];
  const live = channelIsLive(channel, draft);

  const configOf = (key: string): ProviderConfig =>
    draft.providers[key] ?? { status: 'disabled', credentials: defaultCredentials(channel, key) };

  const patch = (key: string, next: Partial<ProviderConfig>) =>
    setDraft((d) => {
      if (!d) return d;
      const current = d.providers[key] ?? {
        status: 'disabled' as const,
        credentials: defaultCredentials(channel, key),
      };
      return { ...d, providers: { ...d.providers, [key]: { ...current, ...next } } };
    });

  const setCredential = (key: string, fieldKey: string, value: string) =>
    patch(key, { credentials: { ...configOf(key).credentials, [fieldKey]: value } });

  async function onSave() {
    if (!draft) return;
    if (problems.length) {
      toast.error('Fix the problems listed above first');
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success(`${meta.label} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  async function onTest() {
    setResult(null);
    try {
      setResult(await test.mutateAsync({ to: testTo, message: `Test ${meta.noun} from your hospital management system.` }));
    } catch (e) {
      setResult({ ok: false, provider: '—', detail: e instanceof Error ? e.message : 'Test failed' });
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title={meta.label}
        description={`Which gateway carries every ${meta.noun} the hospital sends, and the credentials it uses.`}
      />

      {!data.secretsConfigured && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Credential storage is unavailable on this deployment:{' '}
            <code className="font-mono text-xs">SETTINGS_ENCRYPTION_KEY</code> is not set. You can
            look, but saving a credential will fail. Generate one with{' '}
            <code className="font-mono text-xs">openssl rand -base64 32</code> and add it to the API
            environment.
          </span>
        </div>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {live ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>
                Sending through <strong>{labelOf(channel, draft.activeProvider!)}</strong>.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-fg-muted" />
              <span className="text-fg-muted">
                Nothing is being sent on this channel — no provider is active.
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">Active provider</span>
          <div className="w-56">
            <Select
              value={draft.activeProvider ?? ''}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, activeProvider: e.target.value || null } : d))
              }
              options={[
                { value: '', label: 'None — do not send' },
                ...providersFor(channel)
                  // A coming-soon gateway is never offered here: choosing it
                  // would look like configuring the channel and deliver nothing.
                  .filter((p) => !p.comingSoon)
                  .map((p) => ({ value: p.key, label: p.label })),
              ]}
            />
          </div>
        </div>
      </section>

      {problems.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This configuration would not deliver:</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Tabs
        tabs={providersFor(channel).map((p) => ({ value: p.key, label: p.label }))}
        value={tab}
        onChange={setTab}
      />

      {providersFor(channel).map((p) =>
        p.key === tab ? (
          <ProviderPanel
            key={p.key}
            provider={p}
            config={configOf(p.key)}
            isActive={draft.activeProvider === p.key}
            onStatus={(status) => patch(p.key, { status })}
            onCredential={(fk, v) => setCredential(p.key, fk, v)}
          />
        ) : null,
      )}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onSave} disabled={save.isPending || problems.length > 0}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/*
        Only offered once the saved configuration is live. Testing a draft would
        send through whatever is stored, not what is on screen, and report the
        wrong answer with total confidence.
      */}
      <section className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-medium">Send a test {meta.noun}</h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-fg-muted">
            Uses the <strong>saved</strong> configuration and the same code path as real sending, so
            a message arriving here means the next one to a patient will too. Save your changes
            first.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <Field label={channel === 'email' ? 'Send to email address' : 'Send to number'}>
                <TextInput
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder={channel === 'email' ? 'you@hospital.org' : '+14155550100'}
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              onClick={onTest}
              disabled={test.isPending || !testTo.trim() || !data.activeProvider}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {test.isPending ? 'Sending…' : 'Send test'}
            </Button>
          </div>
          {!data.activeProvider && (
            <p className="text-xs text-fg-muted">
              Set an active provider and save before testing.
            </p>
          )}
          {result && (
            <div
              role="status"
              className={`rounded-sm border p-3 text-sm ${
                result.ok ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5 text-danger'
              }`}
            >
              <p className="font-medium">
                {result.ok ? `Sent via ${result.provider}` : `Failed via ${result.provider}`}
              </p>
              <p className="mt-0.5 break-words font-mono text-xs">{result.detail}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProviderPanel({
  provider,
  config,
  isActive,
  onStatus,
  onCredential,
}: {
  provider: ProviderDef;
  config: ProviderConfig;
  isActive: boolean;
  onStatus: (s: 'enabled' | 'disabled') => void;
  onCredential: (fieldKey: string, value: string) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {provider.label}
            {provider.comingSoon && <Badge tone="neutral">Coming soon</Badge>}
            {isActive && <Badge tone="success">Active</Badge>}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">{provider.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">{config.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
          <Switch
            checked={config.status === 'enabled'}
            onChange={(v) => onStatus(v ? 'enabled' : 'disabled')}
            disabled={provider.comingSoon}
          />
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {provider.fields.map((f) => (
          <CredentialInput
            key={f.key}
            field={f}
            value={config.credentials[f.key] ?? ''}
            onChange={(v) => onCredential(f.key, v)}
          />
        ))}
      </div>

      {provider.fields.some((f) => f.secret) && (
        <p className="border-t border-border px-4 py-2.5 text-xs text-fg-muted">
          Stored credentials are shown masked and are never returned in full. Leave a masked field
          untouched to keep it; type over it to replace it.
        </p>
      )}
    </section>
  );
}

function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={field.label} required={field.required} hint={field.help}>
      {field.type === 'select' ? (
        <Select value={value} onChange={(e) => onChange(e.target.value)} options={[...(field.options ?? [])]} />
      ) : (
        <TextInput
          // A masked secret must stay visible as a mask — rendering it into a
          // password input would show eight dots over eight bullets and tell
          // the admin nothing about whether a credential is stored at all.
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

function labelOf(channel: Channel, key: string): string {
  return providersFor(channel).find((p) => p.key === key)?.label ?? key;
}
