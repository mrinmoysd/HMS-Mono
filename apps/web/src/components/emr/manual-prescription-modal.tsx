'use client';

import { useEffect } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { useOpdVisitDetail } from '@/lib/hooks/use-clinical';
import { Modal } from '@/components/ui/modal';
import { opdPrescriptionMeta, printOpdPrescription } from '@/lib/print';

/** Branded "OPD Prescription" letterhead preview — the demo's Manual Prescription action (V3). */
export function ManualPrescriptionModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useOpdVisitDetail(open ? id : null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="OPD Prescription"
      size="md"
      headerActions={
        <>
          {data && (
              <button onClick={() => printOpdPrescription(data)} aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary">
                <Printer className="h-4 w-4" />
              </button>
            )}
        </>
      }
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border border-border p-5">
          <div className="border-b-2 border-primary pb-3">
            <p className="text-lg font-semibold text-primary">Smart Hospital &amp; Research Center</p>
            <p className="text-xs text-fg-muted">Your Health, Our Responsibility</p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {opdPrescriptionMeta(data).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-border/50 py-1.5">
                <span className="text-fg-muted">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-16 text-right text-sm text-fg-muted">Doctor&apos;s Signature</div>
        </div>
      )}
    </Modal>
  );
}
