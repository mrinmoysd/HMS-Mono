'use client';

import { Stethoscope, BedDouble } from 'lucide-react';
import { useVisits } from '@/lib/hooks';

export default function RecordsPage() {
  const visits = useVisits();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">My Records</h1>
      <div className="space-y-2">
        {(visits.data ?? []).map((v) => (
          <div key={v.id} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${v.type === 'ipd' ? 'bg-occupied/10 text-occupied' : 'bg-primary/10 text-primary'}`}>
              {v.type === 'ipd' ? <BedDouble className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">{v.type === 'ipd' ? 'IPD Admission' : 'OPD Visit'}</p>
                <span className="text-xs text-fg-muted">{new Date(v.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-fg-muted">{v.no} · Dr. {v.consultantName}</p>
              {v.detail && <p className="mt-0.5 text-sm">{v.detail}</p>}
            </div>
          </div>
        ))}
        {visits.data && visits.data.length === 0 && <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">No visit records yet.</p>}
      </div>
    </div>
  );
}
