'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { usePrefixes, useSavePrefixes } from '@/lib/hooks/use-settings';

export default function PrefixSettingPage() {
  const { data, isLoading } = usePrefixes();
  const save = useSavePrefixes();
  const toast = useToast();

  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((r) => [r.key, r.prefix])));
  }, [data]);

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const dirty = data.filter((r) => (draft[r.key] ?? r.prefix) !== r.prefix);

  async function onSave() {
    if (dirty.length === 0) return;
    try {
      await save.mutateAsync({
        prefixes: dirty.map((r) => ({ key: r.key, prefix: draft[r.key] ?? r.prefix })),
      });
      toast.success(`Saved ${dirty.length} prefix${dirty.length === 1 ? '' : 'es'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Prefix Setting"
        description="The leading text on every generated number."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Changing a prefix affects numbers issued from now on. Records already created keep the
          number they were issued with — renumbering them would break every printed document that
          quotes one. Capital letters and digits only.
        </span>
      </div>

      <div className="grid gap-4 rounded-md border border-border bg-surface p-4 md:grid-cols-2">
        {data.map((row) => {
          const value = draft[row.key] ?? row.prefix;
          const changed = value !== row.prefix;
          const next = `${value}${row.nextExample.slice(row.prefix.length)}`;
          return (
            <Field key={row.key} label={row.label}>
              <TextInput
                value={value}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [row.key]: e.target.value.toUpperCase() }))
                }
              />
              {/* The next number this counter will actually produce — the
                  fastest way to see the effect of what was just typed. */}
              <p className={`mt-1 font-mono text-xs ${changed ? 'text-primary' : 'text-fg-muted'}`}>
                next: {next}
              </p>
            </Field>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {dirty.length > 0 && (
          <span className="text-sm text-fg-muted">
            {dirty.length} unsaved change{dirty.length === 1 ? '' : 's'}
          </span>
        )}
        <Button onClick={onSave} disabled={dirty.length === 0 || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
