'use client';

import type { EncounterCreditDto } from '@smart-hospital/shared';

/** IPD credit-limit donut: used vs limit, balance in the center (Phase C3). */
export function CreditDonut({ credit }: { credit: EncounterCreditDto }) {
  const { limit, used, balance } = credit;
  const frac = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const over = balance < 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * frac;
  const color = over ? 'var(--color-danger, #dc2626)' : frac > 0.8 ? 'var(--color-warning, #d97706)' : 'var(--color-primary, #1E63E9)';

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="14" className="text-border/50" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <text x="70" y="64" textAnchor="middle" className="rotate-90 fill-fg text-[15px] font-semibold" transform="rotate(90 70 70)">
          {balance.toFixed(0)}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-fg-muted text-[9px]" transform="rotate(90 70 70)">
          balance
        </text>
      </svg>
      <div className="space-y-1 text-sm">
        <Row label="Credit Limit" value={limit.toFixed(2)} />
        <Row label="Used" value={used.toFixed(2)} accent={over ? 'text-danger' : undefined} />
        <Row label="Balance" value={balance.toFixed(2)} accent={over ? 'text-danger' : 'text-success'} />
        {over && <p className="text-xs font-medium text-danger">Credit limit exceeded</p>}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-fg-muted">{label}</span>
      <span className={`tabular font-medium ${accent ?? ''}`}>{value}</span>
    </div>
  );
}
