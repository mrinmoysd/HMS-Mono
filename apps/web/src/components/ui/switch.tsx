'use client';

import { cn } from '@/lib/utils';

/** Toggle for immediate on/off settings (active flags, notification prefs). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = 'md',
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4';

  return (
    <label
      className={cn(
        'inline-flex items-start gap-2.5',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 rounded-full border border-transparent transition-colors',
          track,
          checked ? 'bg-primary' : 'bg-line-strong',
          disabled && 'cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-surface-1 shadow-xs transition-transform',
            knob,
            checked ? shift : 'translate-x-0',
          )}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="text-sm">{label}</span>}
          {description && <span className="block text-xs text-fg-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}
