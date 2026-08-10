'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  attendanceSettingProblems,
  classifyArrival,
  roleIsConfigured,
  type AttendanceSettingInput,
  type RoleAttendanceBand,
} from '@smart-hospital/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useAttendanceSetting, useSaveAttendanceSetting } from '@/lib/hooks/use-settings';

const BLANK: RoleAttendanceBand = {
  presentUntil: '',
  lateUntil: '',
  halfDayUntil: '',
  halfDaySecondShiftUntil: '',
};

const BAND_FIELDS: { key: keyof RoleAttendanceBand; label: string }[] = [
  { key: 'presentUntil', label: 'Present until' },
  { key: 'lateUntil', label: 'Late until' },
  { key: 'halfDayUntil', label: 'Half Day until' },
  { key: 'halfDaySecondShiftUntil', label: 'Half Day (2nd shift) until' },
];

/** Times used to show what the configured ladder would actually decide. */
const PREVIEW_TIMES = ['08:30', '09:15', '11:00', '13:30', '16:00'];

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  half_day_second_shift: 'Half Day (2nd)',
  absent: 'Absent',
};

export default function AttendanceSettingPage() {
  const { data, isLoading } = useAttendanceSetting();
  const save = useSaveAttendanceSetting();
  const toast = useToast();

  const [draft, setDraft] = useState<AttendanceSettingInput | null>(null);
  useEffect(() => {
    if (data) setDraft(data.setting);
  }, [data]);

  const problems = useMemo(() => (draft ? attendanceSettingProblems(draft) : []), [draft]);

  if (isLoading || !data || !draft) return <Skeleton className="h-96 w-full" />;

  const bandOf = (slug: string): RoleAttendanceBand => draft.roles[slug] ?? BLANK;

  const setBand = (slug: string, key: keyof RoleAttendanceBand, value: string) =>
    setDraft((d) =>
      d ? { ...d, roles: { ...d.roles, [slug]: { ...(d.roles[slug] ?? BLANK), [key]: value } } } : d,
    );

  const configuredCount = data.roles.filter((r) => roleIsConfigured(draft, r.slug)).length;

  async function onSave() {
    if (!draft) return;
    if (problems.length) {
      toast.error('Fix the ordering problems first');
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success('Attendance setting saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Attendance Setting"
        description="What a check-in counts as, per role, and whether QR check-in is accepted."
      />

      <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Each threshold is <strong>inclusive</strong> — arriving exactly on it earns the better
          status. A role left blank is not classified at all: its check-ins stay Present, exactly as
          before this screen existed. Times are read in the hospital&apos;s own timezone, set in
          General Setting.
        </span>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium">QR and biometric check-in</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            When off, the API refuses QR and barcode check-in rather than recording it as manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">
            {draft.biometricEnabled ? 'Accepted' : 'Refused'}
          </span>
          <Switch
            checked={draft.biometricEnabled}
            onChange={(v) => setDraft((d) => (d ? { ...d, biometricEnabled: v } : d))}
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium">Arriving after every band</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Both readings are defensible; pick the one your hospital would stand behind.
          </p>
        </div>
        <div className="w-56">
          <Select
            value={draft.afterLastBand}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, afterLastBand: e.target.value as 'absent' | 'half_day' } : d))
            }
            options={[
              { value: 'absent', label: 'Absent' },
              { value: 'half_day', label: 'Half Day' },
            ]}
          />
        </div>
      </section>

      {problems.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">These ladders run backwards:</p>
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
          <h2 className="text-sm font-medium">Time bands by role</h2>
          <span className="text-xs text-fg-muted">
            {configuredCount} of {data.roles.length} configured
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-muted">
                <th className="px-4 py-2 font-medium">Role</th>
                {BAND_FIELDS.map((f) => (
                  <th key={f.key} className="px-3 py-2 font-medium">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2 font-medium">What it would decide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.roles.map((role) => {
                const band = bandOf(role.slug);
                const configured = roleIsConfigured(draft, role.slug);
                return (
                  <tr key={role.slug}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{role.label}</div>
                      {!configured && <div className="text-xs text-fg-subtle">Not classified</div>}
                    </td>
                    {BAND_FIELDS.map((f) => (
                      <td key={f.key} className="px-3 py-2">
                        <TextInput
                          value={band[f.key]}
                          placeholder="HH:MM"
                          aria-label={`${role.label} ${f.label}`}
                          onChange={(e) => setBand(role.slug, f.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      {/*
                        The rule, applied to sample arrivals. An admin should be
                        able to see what a ladder decides before somebody is
                        marked late by it.
                      */}
                      {configured ? (
                        <div className="flex flex-wrap gap-1">
                          {PREVIEW_TIMES.map((t) => {
                            const verdict = classifyArrival(draft, role.slug, t);
                            return (
                              <span key={t} className="text-xs text-fg-muted">
                                {t}
                                <Badge
                                  tone={
                                    verdict === 'present'
                                      ? 'success'
                                      : verdict === 'absent'
                                        ? 'danger'
                                        : 'neutral'
                                  }
                                  className="ml-1"
                                >
                                  {STATUS_LABEL[verdict ?? ''] ?? '—'}
                                </Badge>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-fg-subtle">Check-ins stay Present</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onSave} disabled={save.isPending || problems.length > 0}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
