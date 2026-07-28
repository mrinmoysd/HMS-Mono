'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { usePatientSearch } from '@/lib/hooks/use-clinical';

interface Props {
  value: string;
  onChange: (patientId: string, label: string) => void;
  selectedLabel?: string;
}

/** Searchable patient picker used by the appointment & OPD forms (FRD "Patient / New Patient"). */
export function PatientSelect({ value, onChange, selectedLabel }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = usePatientSearch(q);

  if (value && !open) {
    return (
      <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
        <span>{selectedLabel ?? 'Selected patient'}</span>
        <button type="button" className="text-xs text-primary" onClick={() => setOpen(true)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, phone, or patient no…"
        className="w-full rounded-sm border border-border bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
      />
      {q && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-sm border border-border bg-surface shadow-md">
          {(data?.data ?? []).map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onChange(p.id, `${p.name} · ${p.patientNo}`);
                setOpen(false);
                setQ('');
              }}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-bg"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-fg-muted">
                {p.patientNo} · {p.age}
                {p.phone ? ` · ${p.phone}` : ''}
              </span>
            </button>
          ))}
          {data && data.data.length === 0 && (
            <p className="px-3 py-2 text-sm text-fg-muted">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}
