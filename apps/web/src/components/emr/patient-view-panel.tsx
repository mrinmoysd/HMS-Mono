'use client';

import { useState } from 'react';
import { Search, Loader2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatientDirectory } from '@/lib/hooks/use-clinical';
import { usePatientProfile } from '@/lib/hooks/use-emr';
import { VisitsPanel } from './visits-panel';

/** OPD "Patient View" tab: searchable patient sidebar + the selected patient's visit history. */
export function PatientViewPanel() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = usePatientDirectory(search);
  const patients = data?.data ?? [];
  const selected = patients.find((p) => p.id === selectedId);

  const { data: profile, isLoading: profileLoading } = usePatientProfile(selectedId ?? '');

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border p-3">
          <p className="text-sm font-semibold">Patient View {data && <span className="text-fg-muted">({data.meta.total})</span>}</p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID / Name"
              className="w-full rounded-sm border border-border bg-bg py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-fg-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && patients.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-fg-muted">No patients found</p>
          )}
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                'flex w-full items-center gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm hover:bg-primary/5',
                selectedId === p.id && 'bg-primary/10',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <span className="shrink-0 rounded-sm bg-bg px-1.5 py-0.5 text-xs text-fg-muted">{p.patientNo}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        {!selectedId && (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-md border border-dashed border-border text-sm text-fg-muted">
            Select a patient to view their OPD visit history
          </div>
        )}
        {selectedId && profileLoading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-md border border-border bg-surface text-fg-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {selectedId && profile && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">{selected?.name ?? profile.header.name}&apos;s Visits</h3>
            <VisitsPanel rows={profile.visits} patientId={selectedId} patientName={selected?.name ?? profile.header.name} />
          </div>
        )}
      </div>
    </div>
  );
}
