'use client';

import { useEffect, useState } from 'react';
import { Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import type { FrontCmsSettingInput } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useFrontCmsSetting, useSaveFrontCmsSetting } from '@/lib/hooks/use-settings';

export default function FrontCmsSettingPage() {
  const { data, isLoading } = useFrontCmsSetting();
  const save = useSaveFrontCmsSetting();
  const toast = useToast();

  const [form, setForm] = useState<FrontCmsSettingInput | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <Skeleton className="h-96 w-full" />;

  const set = <K extends keyof FrontCmsSettingInput>(k: K, v: FrontCmsSettingInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  async function onSave() {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast.success(form.enabled ? 'Saved — the public site is live' : 'Saved — the public site is off');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Front CMS Setting"
        description="The public website: whether it is published at all, and what it says."
      />

      {/*
        The switch is the whole point of this screen, so it is not buried in a
        section with the text fields. Said plainly in both directions, because
        "enabled" on its own does not tell an administrator that flipping it
        puts hospital content on the open internet.
      */}
      <section className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <Globe className={`mt-0.5 h-5 w-5 shrink-0 ${form.enabled ? 'text-primary' : 'text-fg-muted'}`} />
            <div>
              <p className="text-sm font-medium">Publish the public website</p>
              <p className="mt-0.5 max-w-2xl text-xs text-fg-muted">
                {form.enabled
                  ? 'Anyone on the internet can read the pages, banners and menus marked published in Front CMS, with no sign-in.'
                  : 'The public endpoints return “not found”. Nothing from Front CMS is reachable without signing in.'}
              </p>
            </div>
          </div>
          <Switch checked={form.enabled} onChange={(v) => set('enabled', v)} />
        </div>

        {form.enabled && (
          <div className="flex items-start gap-2 border-t border-border bg-warning/5 px-4 py-2.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              Published pages are world-readable while this is on. Check{' '}
              <a href="/front_cms" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                Front CMS <ExternalLink className="h-3 w-3" />
              </a>{' '}
              before switching it on — anything marked published goes out.
            </span>
          </div>
        )}
      </section>

      <Section title="Site identity">
        <Field label="Site Name" hint="Defaults to the hospital name from General Setting">
          <TextInput value={form.siteName} onChange={(e) => set('siteName', e.target.value)} />
        </Field>
        <Field label="Tagline">
          <TextInput value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
        </Field>
        <Field label="Logo URL">
          <TextInput value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} />
        </Field>
        <Field label="Favicon URL">
          <TextInput value={form.faviconUrl} onChange={(e) => set('faviconUrl', e.target.value)} />
        </Field>
        <Field label="Footer Text" className="md:col-span-2">
          <TextInput value={form.footerText} onChange={(e) => set('footerText', e.target.value)} />
        </Field>
      </Section>

      <Section title="Search engines and link previews">
        <Field label="Meta Title" hint="Falls back to the site name">
          <TextInput value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
        </Field>
        <Field label="Meta Keywords" hint="Comma separated">
          <TextInput value={form.metaKeywords} onChange={(e) => set('metaKeywords', e.target.value)} />
        </Field>
        <Field label="Meta Description" className="md:col-span-2">
          <TextArea rows={2} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
        </Field>
        <Field
          label="Google Analytics ID"
          hint="Like G-ABCD1234, or leave blank. Refused if it is not that shape — this value goes into the public page."
        >
          <TextInput value={form.analyticsId} onChange={(e) => set('analyticsId', e.target.value)} />
        </Field>
      </Section>

      <Section title="Contact shown on the site">
        <Field label="Address" className="md:col-span-2">
          <TextInput value={form.contactAddress} onChange={(e) => set('contactAddress', e.target.value)} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
        </Field>
      </Section>

      <Section title="Social links">
        <Field label="Facebook">
          <TextInput value={form.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} />
        </Field>
        <Field label="Twitter / X">
          <TextInput value={form.twitterUrl} onChange={(e) => set('twitterUrl', e.target.value)} />
        </Field>
        <Field label="Instagram">
          <TextInput value={form.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} />
        </Field>
        <Field label="YouTube">
          <TextInput value={form.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <TextInput value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
        </Field>
      </Section>

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
