'use client';

import type { MedicalHistoryPoint } from '@smart-hospital/shared';

const SERIES: { key: keyof MedicalHistoryPoint; label: string; color: string }[] = [
  { key: 'opd', label: 'OPD', color: '#1E63E9' },
  { key: 'pharmacy', label: 'Pharmacy', color: '#16A34A' },
  { key: 'pathology', label: 'Pathology', color: '#DC2626' },
  { key: 'radiology', label: 'Radiology', color: '#7C3AED' },
  { key: 'blood', label: 'Blood Bank', color: '#EC4899' },
  { key: 'ambulance', label: 'Ambulance', color: '#D97706' },
];

/** Compact per-year multi-line chart (pure SVG, no chart lib). */
export function MedicalHistoryChart({ data }: { data: MedicalHistoryPoint[] }) {
  if (data.length === 0) return <p className="text-sm text-fg-muted">No history yet.</p>;
  const W = 520, H = 200, PAD = 28;
  const maxY = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => Number(d[s.key]))));
  const xs = (i: number) => PAD + (data.length === 1 ? (W - 2 * PAD) / 2 : (i * (W - 2 * PAD)) / (data.length - 1));
  const ys = (v: number) => H - PAD - (v / maxY) * (H - 2 * PAD);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgb(var(--border))" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgb(var(--border))" />
        {SERIES.map((s) => {
          const pts = data.map((d, i) => `${xs(i)},${ys(Number(d[s.key]))}`).join(' ');
          return (
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} />
              {data.map((d, i) => <circle key={i} cx={xs(i)} cy={ys(Number(d[s.key]))} r={2.5} fill={s.color} />)}
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={d.year} x={xs(i)} y={H - PAD + 14} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 10 }}>{d.year}</text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
