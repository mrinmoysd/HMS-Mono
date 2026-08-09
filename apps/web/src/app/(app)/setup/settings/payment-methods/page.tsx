'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import {
  PAYMENT_GATEWAYS,
  computeProcessingFee,
  defaultGatewayCredentials,
  modeWarnings,
  paymentsAreLive,
  validatePaymentSetting,
  type CredentialField,
  type GatewayConfig,
  type PaymentGatewayDef,
  type PaymentSettingInput,
} from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { usePaymentMethods, useSavePaymentMethods } from '@/lib/hooks/use-settings';

const MODE_OPTIONS = [
  { value: 'test', label: 'Test — sandbox, no real money' },
  { value: 'live', label: 'Live — real payments' },
];

export default function PaymentMethodsPage() {
  const { data, isLoading } = usePaymentMethods();
  const save = useSavePaymentMethods();
  const toast = useToast();

  const [draft, setDraft] = useState<PaymentSettingInput | null>(null);
  const [tab, setTab] = useState<string>(PAYMENT_GATEWAYS[0]!.key);

  useEffect(() => {
    if (!data) return;
    setDraft({ activeGateway: data.activeGateway, gateways: data.gateways });
    if (data.activeGateway) setTab(data.activeGateway);
  }, [data]);

  const problems = useMemo(() => (draft ? validatePaymentSetting(draft) : []), [draft]);
  const warnings = useMemo(() => (draft ? modeWarnings(draft) : []), [draft]);

  if (isLoading || !data || !draft) return <Skeleton className="h-96 w-full" />;

  const live = paymentsAreLive(draft);
  const activeCfg = draft.activeGateway ? draft.gateways[draft.activeGateway] : undefined;

  const configOf = (key: string): GatewayConfig =>
    draft.gateways[key] ?? {
      status: 'disabled',
      mode: 'test',
      feePercent: 0,
      feeFixed: 0,
      credentials: defaultGatewayCredentials(key),
    };

  const patch = (key: string, next: Partial<GatewayConfig>) =>
    setDraft((d) => {
      if (!d) return d;
      const current = d.gateways[key] ?? {
        status: 'disabled' as const,
        mode: 'test' as const,
        feePercent: 0,
        feeFixed: 0,
        credentials: defaultGatewayCredentials(key),
      };
      return { ...d, gateways: { ...d.gateways, [key]: { ...current, ...next } } };
    });

  async function onSave() {
    if (!draft) return;
    if (problems.length) {
      toast.error('Fix the problems listed above first');
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success('Payment methods saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Payment Methods"
        description="The gateway that takes online payments from patients, and what it keeps."
      />

      {!data.secretsConfigured && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Credential storage is unavailable on this deployment:{' '}
            <code className="font-mono text-xs">SETTINGS_ENCRYPTION_KEY</code> is not set. Saving a
            gateway key will fail until it is added to the API environment.
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This configures <strong>online</strong> payments made by patients through the portal.
          Payments taken at the counter — cash, card, cheque, UPI — are recorded by the cashier and
          need nothing here. Until a gateway is active and enabled, the portal refuses online
          payment rather than recording one.
        </span>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {live ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>
                Taking payments through <strong>{labelOf(draft.activeGateway!)}</strong>
                {activeCfg && (
                  <Badge tone={activeCfg.mode === 'live' ? 'success' : 'neutral'} className="ml-2">
                    {activeCfg.mode === 'live' ? 'Live' : 'Test'}
                  </Badge>
                )}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-fg-muted" />
              <span className="text-fg-muted">No gateway is active — online payment is switched off.</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">Active gateway</span>
          <div className="w-56">
            <Select
              value={draft.activeGateway ?? ''}
              onChange={(e) => setDraft((d) => (d ? { ...d, activeGateway: e.target.value || null } : d))}
              options={[
                { value: '', label: 'None — no online payment' },
                ...PAYMENT_GATEWAYS.filter((g) => !g.comingSoon).map((g) => ({ value: g.key, label: g.label })),
              ]}
            />
          </div>
        </div>
      </section>

      {problems.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This configuration would not take payments:</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/*
        A warning, not a block: key prefixes are a convention, so we cannot be
        certain. Refusing the save on a guess would strand a hospital whose
        gateway uses a format we do not recognise.
      */}
      {warnings.length > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Check the mode before going live:</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Tabs
        tabs={PAYMENT_GATEWAYS.map((g) => ({ value: g.key, label: g.label }))}
        value={tab}
        onChange={setTab}
      />

      {PAYMENT_GATEWAYS.map((g) =>
        g.key === tab ? (
          <GatewayPanel
            key={g.key}
            gateway={g}
            config={configOf(g.key)}
            isActive={draft.activeGateway === g.key}
            onChange={(next) => patch(g.key, next)}
          />
        ) : null,
      )}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onSave} disabled={save.isPending || problems.length > 0}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function GatewayPanel({
  gateway,
  config,
  isActive,
  onChange,
}: {
  gateway: PaymentGatewayDef;
  config: GatewayConfig;
  isActive: boolean;
  onChange: (next: Partial<GatewayConfig>) => void;
}) {
  const sample = computeProcessingFee(1000, config);

  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {gateway.label}
            {gateway.comingSoon && <Badge tone="neutral">Coming soon</Badge>}
            {isActive && <Badge tone="success">Active</Badge>}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {gateway.blurb} Accepts {gateway.currencies.join(', ')}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">{config.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
          <Switch
            checked={config.status === 'enabled'}
            onChange={(v) => onChange({ status: v ? 'enabled' : 'disabled' })}
            disabled={gateway.comingSoon}
          />
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="Mode" hint="Test uses the gateway's sandbox. No real money moves.">
          <Select
            value={config.mode}
            onChange={(e) => onChange({ mode: e.target.value as 'test' | 'live' })}
            options={MODE_OPTIONS}
          />
        </Field>
        <div />

        {gateway.fields.map((f) => (
          <CredentialInput key={f.key} field={f} value={config.credentials[f.key] ?? ''} onChange={(v) => onChange({ credentials: { ...config.credentials, [f.key]: v } })} />
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-xs font-medium">Processing fee</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Percentage of the payment">
            <TextInput
              type="number"
              value={String(config.feePercent)}
              onChange={(e) => onChange({ feePercent: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Flat amount per transaction">
            <TextInput
              type="number"
              value={String(config.feeFixed)}
              onChange={(e) => onChange({ feeFixed: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Recorded against each payment for reconciliation — it is not added to what the patient
          pays. On a payment of 1,000 the gateway would keep <strong>{sample.toFixed(2)}</strong>.
        </p>
      </div>

      <p className="border-t border-border px-4 py-2.5 text-xs text-fg-muted">
        Stored keys are shown masked and never returned in full. Leave a masked field untouched to
        keep it; type over it to replace it.
      </p>
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
      <TextInput
        type="text"
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function labelOf(key: string): string {
  return PAYMENT_GATEWAYS.find((g) => g.key === key)?.label ?? key;
}
