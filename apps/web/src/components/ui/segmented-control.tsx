'use client';

import { cn } from '@/lib/utils';

/**
 * Two-to-four exclusive choices shown side by side — the Group/Individual
 * toggle in Messaging, the card/list switch in the Staff Directory, and the
 * date-range presets. Each of those is currently hand-rolled with underlines
 * or bordered buttons.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth,
  className,
}: {
  options: { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              fullWidth && 'flex-1',
              active
                ? 'bg-surface-1 text-fg shadow-xs'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
