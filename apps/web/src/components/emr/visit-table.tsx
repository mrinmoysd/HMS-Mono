'use client';

import type { ProfileVisitRow } from '@smart-hospital/shared';

/** Shared visit/treatment table (Patient Profile + OPD/IPD detail pages). */
export function EncounterVisitTable({ rows }: { rows: ProfileVisitRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-fg-muted">No visits.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-fg-muted">
            <th className="px-2 py-2 font-semibold">OPD No</th>
            <th className="px-2 py-2 font-semibold">Case ID</th>
            <th className="px-2 py-2 font-semibold">Date</th>
            <th className="px-2 py-2 font-semibold">Consultant</th>
            <th className="px-2 py-2 font-semibold">Symptoms</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-2 py-2 font-medium text-primary">{r.opdNo}</td>
              <td className="px-2 py-2">{r.caseNo ?? '—'}</td>
              <td className="px-2 py-2">{new Date(r.appointmentDate).toLocaleDateString()}</td>
              <td className="px-2 py-2">{r.consultantName}</td>
              <td className="px-2 py-2 text-fg-muted">{r.symptoms ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
