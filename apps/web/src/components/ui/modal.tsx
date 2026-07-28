'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * The single modal implementation for the app.
 *
 * Replaces the ~51 hand-rolled `fixed inset-0 z-50 …` overlays, none of which
 * trapped focus, locked scroll, or handled Escape consistently. Everything here
 * is behaviour those copies were missing:
 *   - focus moves into the dialog on open and is restored on close
 *   - Tab / Shift+Tab cycle inside the dialog
 *   - Escape closes (opt out with `dismissible={false}`)
 *   - body scroll is locked, ref-counted so nested modals don't unlock early
 *   - rendered through a portal at `z-modal`, above dropdowns but below toasts
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Ref-counted so closing an inner modal doesn't restore scrolling under an outer one. */
let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ > 0) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
}

function unlockScroll() {
  if (--scrollLocks > 0) return;
  scrollLocks = 0;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Secondary line under the title. */
  description?: React.ReactNode;
  size?: ModalSize;
  /** Escape and backdrop clicks close the modal. Default true. */
  dismissible?: boolean;
  /** Hide the header X. The header itself is omitted when there is no title. */
  hideClose?: boolean;
  /** Rendered in the footer bar. Omit for a modal with no actions. */
  footer?: React.ReactNode;
  /** Extra controls in the header, left of the close button. */
  headerActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  dismissible = true,
  hideClose,
  footer,
  headerActions,
  className,
  children,
}: ModalProps) {
  // Explicitly nullable so the ref is mutable — `useRef<T>(null)` yields a
  // read-only RefObject, which the callback ref below cannot assign to.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => setMounted(true), []);

  // Scroll lock for as long as this modal is open.
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return unlockScroll;
  }, [open]);

  // Remember what had focus, and give it back when the modal closes.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    return () => restoreFocusRef.current?.focus?.();
  }, [open]);

  /**
   * Focus moves in via a callback ref rather than an effect, because the panel
   * does not exist on the first commit after `open` flips — `mounted` starts
   * false so the portal renders nothing until the mount effect runs. An effect
   * keyed on `open` alone fires while panelRef is still null and silently skips
   * the trap; keying it on `mounted` too fixes that but makes the deps array
   * change length. A ref callback fires exactly when the node appears.
   */
  const attachPanel = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node;
    if (!node) return;
    const first = node.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node).focus();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose],
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 animate-fade-in bg-fg/40 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={attachPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative my-auto flex max-h-[calc(100vh-3rem)] w-full flex-col',
          'animate-zoom-in rounded-lg border border-line bg-surface-1 shadow-xl outline-none',
          SIZES[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="truncate text-base font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              {!hideClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export interface ModalFormProps extends Omit<ModalProps, 'footer' | 'children'> {
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Extra footer buttons (e.g. "Save & Print"), rendered before Cancel/Save. */
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Modal wrapped in a <form> with a Cancel/Save footer — the shape almost every
 * existing hand-rolled modal already has, so migrations are close to mechanical.
 */
export function ModalForm({
  onSubmit,
  submitting,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  extraActions,
  children,
  onClose,
  ...modalProps
}: ModalFormProps) {
  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          {extraActions}
          <Button type="button" loading={submitting} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {children}
        {/* Lets Enter submit from any field even though the buttons live in the footer. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
