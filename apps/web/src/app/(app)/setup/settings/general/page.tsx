'use client';

import { useEffect, useState } from 'react';
import type { GeneralSettingInput } from '@smart-hospital/shared';
import { DATE_FORMATS, SCAN_TYPES, TIME_FORMATS } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useGeneralSetting, useSaveGeneralSetting } from '@/lib/hooks/use-settings';

/** Common IANA zones. Free text is still accepted — this is a shortcut, not a limit. */
const TIME_ZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London',
  'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC',
];

export default function GeneralSettingPage() {
  const { data, isLoading } = useGeneralSetting();
  const save = useSaveGeneralSetting();
  const toast = useToast();

  const [form, setForm] = useState<GeneralSettingInput | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <Skeleton className="h-96 w-full" />;

  const set = <K extends keyof GeneralSettingInput>(k: K, v: GeneralSettingInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  async function onSave() {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="General Setting"
        description="Hospital identity, formats and behaviour. Applies to this branch."
      />

      <Section title="Identity">
        <Field label="Hospital Name" required>
          <TextInput value={form.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} />
        </Field>
        <Field label="Hospital Code">
          <TextInput value={form.hospitalCode} onChange={(e) => set('hospitalCode', e.target.value)} />
        </Field>
        <Field label="Address" required className="md:col-span-2">
          <TextInput value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Phone" required>
          <TextInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Email" required>
          <TextInput type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
      </Section>

      <Section title="Date & time">
        <Field label="Date Format" required>
          <Select
            value={form.dateFormat}
            onChange={(e) => set('dateFormat', e.target.value as GeneralSettingInput['dateFormat'])}
            options={DATE_FORMATS.map((v) => ({ value: v, label: v }))}
          />
        </Field>
        <Field label="Time Format" required>
          <Select
            value={form.timeFormat}
            onChange={(e) => set('timeFormat', e.target.value as GeneralSettingInput['timeFormat'])}
            options={TIME_FORMATS.map((v) => ({ value: v, label: v }))}
          />
        </Field>
        <Field label="Time Zone" required>
          <Select
            value={form.timeZone}
            onChange={(e) => set('timeZone', e.target.value)}
            options={TIME_ZONES.map((v) => ({ value: v, label: v }))}
          />
        </Field>
        <Field label="Language" required>
          <TextInput value={form.language} onChange={(e) => set('language', e.target.value)} />
        </Field>
      </Section>

      <Section title="Currency">
        <Field label="Currency" required>
          <TextInput value={form.currency} onChange={(e) => set('currency', e.target.value)} />
        </Field>
        <Field label="Currency Symbol" required>
          <TextInput value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} />
        </Field>
        <Field label="Credit Limit" required>
          <TextInput
            type="number"
            value={String(form.creditLimit)}
            onChange={(e) => set('creditLimit', Number(e.target.value) || 0)}
          />
        </Field>
      </Section>

      <Section title="Behaviour">
        <Toggle
          label="Doctor Restriction Mode"
          hint="A doctor sees only their own patients."
          checked={form.doctorRestrictionMode}
          onChange={(v) => set('doctorRestrictionMode', v)}
        />
        <Toggle
          label="Patient Panel"
          hint="The patient self-service portal."
          checked={form.patientPanel}
          onChange={(v) => set('patientPanel', v)}
        />
        <Toggle
          label="Patient Delete Account"
          hint="Lets a patient delete their own portal account."
          checked={form.patientDeleteAccount}
          onChange={(v) => set('patientDeleteAccount', v)}
        />
        <Field label="Scan Type">
          <SegmentedControl
            value={form.scanType}
            onChange={(v) => set('scanType', v as GeneralSettingInput['scanType'])}
            options={SCAN_TYPES.map((v) => ({ value: v, label: v === 'qr' ? 'QR Code' : 'Barcode' }))}
          />
        </Field>
        <Field label="Notification poll interval (seconds)">
          <TextInput
            type="number"
            value={String(form.notificationPollSeconds)}
            onChange={(e) => set('notificationPollSeconds', Number(e.target.value) || 60)}
          />
        </Field>
      </Section>

      {/*
        Base URL and File Upload Path are deliberately absent — see the
        anti-parity list in docs/SETTINGS_PARITY_PLAN.md. They are deployment
        facts read from the environment, not hospital preferences, and an
        editable file path is a directory traversal invitation.
      */}

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-2.5 text-sm font-medium">{title}</h2>
      <div className="grid gap-4 p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
