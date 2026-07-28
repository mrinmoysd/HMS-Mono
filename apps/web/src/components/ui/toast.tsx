'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast notifications. Today every mutation in the app succeeds silently — the
 * user gets no confirmation that a save, delete or send actually happened.
 *
 *     const toast = useToast();
 *     toast.success('Patient saved');
 *     toast.error('Could not reach the server', { description: err.message });
 */

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  description?: React.ReactNode;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Errors default to sticky. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: number;
  tone: ToastTone;
  message: React.ReactNode;
}

const TONE: Record<ToastTone, { icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-success' },
  error: { icon: XCircle, accent: 'text-danger' },
  warning: { icon: AlertTriangle, accent: 'text-warning' },
  info: { icon: Info, accent: 'text-info' },
};

interface ToastApi {
  show: (tone: ToastTone, message: React.ReactNode, options?: ToastOptions) => number;
  success: (message: React.ReactNode, options?: ToastOptions) => number;
  error: (message: React.ReactNode, options?: ToastOptions) => number;
  warning: (message: React.ReactNode, options?: ToastOptions) => number;
  info: (message: React.ReactNode, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (tone: ToastTone, message: React.ReactNode, options: ToastOptions = {}) => {
      const id = nextId.current++;
      // Errors stay put — they usually carry something the user needs to act on.
      const duration = options.duration ?? (tone === 'error' ? 0 : 4500);
      setToasts((list) => [...list, { ...options, id, tone, message, duration }]);
      return id;
    };
    return {
      show,
      success: (m, o) => show('success', m, o),
      error: (m, o) => show('error', m, o),
      warning: (m, o) => show('warning', m, o),
      info: (m, o) => show('info', m, o),
      dismiss,
    };
  }, [dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="false"
            className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const { icon: Icon, accent } = TONE[toast.tone];

  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.id, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-md border border-line bg-surface-2 p-3 shadow-lg"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', accent)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.description && <p className="mt-0.5 text-xs text-fg-muted">{toast.description}</p>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-1.5 text-xs font-medium text-primary hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-m-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
