'use client';

import { cn } from '@/lib/utils';

interface TabsProps<T extends string> {
  tabs: {
    value: T;
    label: string;
    /** Optional badge count, e.g. pending items on a tab. */
    count?: number;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

/** Module sub-navigation. `count`, `icon` and `className` are optional additions. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => {
        const active = value === t.value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 py-0.5 text-2xs',
                  active ? 'bg-primary-soft text-primary' : 'bg-surface-sunken text-fg-muted',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
