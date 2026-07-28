'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Modal } from './modal';

/**
 * Replacement for the 34 native `confirm()` calls.
 *
 * The imperative hook keeps migrations close to a one-liner:
 *     if (confirm(`Delete "${x.name}"?`)) await del(x.id);
 *     if (await confirm({ title: `Delete "${x.name}"?` })) await del(x.id);
 *
 * `confirm()` is synchronous and blocks the event loop; this returns a Promise,
 * so every call site must become `async`. That is the one non-mechanical part —
 * see docs/UI_SYSTEM_PLAN.md §5.6.
 */

export type ConfirmTone = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

const TONE: Record<ConfirmTone, { icon: React.ComponentType<{ className?: string }>; wrap: string; button: 'danger' | 'primary' }> = {
  danger: { icon: Trash2, wrap: 'bg-danger-soft text-danger', button: 'danger' },
  warning: { icon: AlertTriangle, wrap: 'bg-warning-soft text-warning', button: 'primary' },
  info: { icon: Info, wrap: 'bg-info-soft text-info', button: 'primary' },
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setPending(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setPending(false);
    setOptions(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending}
        options={options}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

/** Throws if the provider is missing — a silent no-op would skip the guard entirely. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmDialog({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tone = TONE[options?.tone ?? 'danger'];
  const Icon = tone.icon;

  return (
    <Modal
      open={open && !!options}
      onClose={onCancel}
      size="sm"
      hideClose
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {options?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={tone.button} onClick={onConfirm}>
            {options?.confirmLabel ?? 'Delete'}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone.wrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 pt-1">
          <p className="font-semibold">{options?.title}</p>
          {options?.description && (
            <p className="mt-1 text-sm text-fg-muted">{options.description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Convenience for the common "delete X?" shape. */
export function useConfirmDelete() {
  const confirm = useConfirm();
  return useMemo(
    () =>
      (label: string, description?: React.ReactNode) =>
        confirm({
          title: `Delete ${label}?`,
          description: description ?? 'This action cannot be undone.',
          confirmLabel: 'Delete',
          tone: 'danger',
        }),
    [confirm],
  );
}
