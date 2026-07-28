'use client';

import { X } from 'lucide-react';
import { useBedStatus } from '@/lib/hooks/use-ipd';
import { cn } from '@/lib/utils';

/**
 * Full-screen live bed occupancy overlay (FRD §2.30). Grouped Floor → Bed Group,
 * one tile per bed: green + bed number when available, pink + patient name when
 * allotted — an at-a-glance occupancy map of the hospital.
 */
export function BedGrid({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useBedStatus(open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-5">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold">Bed Status</h2>
          {data && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-success/30 ring-1 ring-success" /> {data.available} Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-occupied/30 ring-1 ring-occupied" /> {data.allotted} Allotted
              </span>
              <span className="text-fg-muted">of {data.total} beds</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && <p className="text-sm text-fg-muted">Loading occupancy…</p>}
        {data && data.total === 0 && (
          <p className="text-sm text-fg-muted">
            No beds configured yet. Add beds under Setup → Beds.
          </p>
        )}
        <div className="space-y-6">
          {data?.floors.map((floor) => (
            <div key={floor.floorId ?? 'none'}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
                {floor.floorName}
              </h3>
              <div className="space-y-4">
                {floor.groups.map((group) => (
                  <div key={group.bedGroupId}>
                    <p className="mb-2 text-sm font-medium">{group.bedGroupName}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.beds.map((bed) => (
                        <div
                          key={bed.id}
                          title={bed.patientName ?? `Bed ${bed.bedNo} — available`}
                          className={cn(
                            'flex h-20 w-28 flex-col items-center justify-center rounded-md border p-2 text-center text-xs',
                            bed.status === 'available'
                              ? 'border-success bg-success/10 text-success'
                              : 'border-occupied bg-occupied/10 text-occupied',
                          )}
                        >
                          <span className="font-semibold">{bed.bedNo}</span>
                          <span className="mt-1 line-clamp-2 leading-tight">
                            {bed.status === 'available' ? 'Available' : bed.patientName}
                          </span>
                          {bed.ipdNo && <span className="mt-0.5 text-[10px] opacity-70">{bed.ipdNo}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
