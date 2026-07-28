'use client';

import type { CurrentVitalDto } from '@smart-hospital/shared';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  low: 'bg-info/10 text-info',
  high: 'bg-danger/10 text-danger',
  normal: 'bg-success/10 text-success',
  na: 'bg-border/60 text-fg-muted',
};

export function CurrentVitals({ vitals, bmi }: { vitals: CurrentVitalDto[]; bmi: number | null }) {
  if (vitals.length === 0 && bmi == null) {
    return <p className="text-sm text-fg-muted">No vitals recorded.</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      {vitals.map((v) => (
        <div key={v.vitalTypeId} className="flex items-center gap-3">
          <span className="w-24 shrink-0 font-medium">{v.name}</span>
          <span className="tabular">{v.value}{v.unit ? ` ${v.unit}` : ''}</span>
          {v.status !== 'na' && (
            <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium capitalize', TONE[v.status])}>
              {v.status}
            </span>
          )}
          <span className="ml-auto text-xs text-fg-muted">{new Date(v.recordedAt).toLocaleString()}</span>
        </div>
      ))}
      {bmi != null && (
        <div className="flex items-center gap-3 pt-1">
          <span className="w-24 shrink-0 font-medium">BMI</span>
          <span className={cn('rounded-sm px-2 py-0.5 text-xs font-semibold', bmi >= 30 ? 'bg-danger/10 text-danger' : bmi >= 25 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success')}>
            {bmi.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
