'use client';

import { cn } from '@/lib/utils';

/**
 * Inline chip for counts, roles, module tags and record states.
 *
 * Distinct from StatusPill: StatusPill maps a known workflow status string to a
 * tone automatically, Badge takes the tone explicitly.
 */

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-fg-muted ring-line',
  primary: 'bg-primary-soft text-primary ring-primary/20',
  accent: 'bg-accent-soft text-accent ring-accent/20',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
};

export function Badge({
  tone = 'neutral',
  size = 'md',
  dot,
  icon: Icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  /** Leading status dot, for at-a-glance scanning in dense tables. */
  dot?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-0.5 text-xs',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
