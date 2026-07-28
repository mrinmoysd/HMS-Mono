'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface FormDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  /** Wider drawer for multi-column editors (e.g. the charge-line editor). */
  wide?: boolean;
  /** Optional extra footer buttons (e.g. "Save & Print"), rendered before Cancel/Save. */
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

/** Right-side drawer for long Add/Edit forms (FRONTEND_DESIGN §4.2). */
export function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  submitting,
  submitLabel = 'Save',
  wide,
  extraActions,
  children,
}: FormDrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex h-full w-full flex-col bg-surface shadow-lg ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {extraActions}
            <Button type="submit" loading={submitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
