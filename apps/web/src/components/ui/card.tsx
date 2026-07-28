'use client';

import { cn } from '@/lib/utils';

/**
 * Replaces the `rounded-md border border-border bg-surface` triplet that is
 * hand-written on nearly every panel in the app, and the matching
 * `border-b border-border px-5 py-3` header bar.
 */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('rounded-lg border border-line bg-surface-1 shadow-sm', className)}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned controls (buttons, tabs, export menu). */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5',
        className,
      )}
    >
      {children ?? (
        <div className="min-w-0">
          {title && <h2 className="truncate text-base font-semibold">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
      )}
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-card', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
