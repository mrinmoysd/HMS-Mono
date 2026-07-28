'use client';

import { useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox and Radio. The app currently uses bare `<input type="checkbox">`
 * everywhere, which renders at the OS default size and ignores the palette —
 * conspicuous in the dark theme and in the select-all table columns.
 */

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** Select-all header state when only some rows are selected. */
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  description,
  indeterminate,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // `indeterminate` is a DOM property with no HTML attribute, so it has to be set imperatively.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cn(
        'group inline-flex items-start gap-2.5',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          {...props}
          className="peer h-4 w-4 cursor-[inherit] appearance-none rounded-xs border border-line-strong bg-surface-1 transition checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary disabled:cursor-not-allowed"
        />
        <Check className="pointer-events-none absolute h-3 w-3 text-primary-fg opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0" />
        <Minus className="pointer-events-none absolute h-3 w-3 text-primary-fg opacity-0 peer-indeterminate:opacity-100" />
      </span>
      {(label || description) && (
        <span className="min-w-0 -mt-0.5">
          {label && <span className="text-sm">{label}</span>}
          {description && <span className="block text-xs text-fg-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export function Radio({ label, description, className, disabled, ...props }: RadioProps) {
  return (
    <label
      className={cn(
        'group inline-flex items-start gap-2.5',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="radio"
          disabled={disabled}
          {...props}
          className="peer h-4 w-4 cursor-[inherit] appearance-none rounded-full border border-line-strong bg-surface-1 transition checked:border-primary checked:bg-primary disabled:cursor-not-allowed"
        />
        <span className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-primary-fg opacity-0 peer-checked:opacity-100" />
      </span>
      {(label || description) && (
        <span className="min-w-0 -mt-0.5">
          {label && <span className="text-sm">{label}</span>}
          {description && <span className="block text-xs text-fg-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  inline,
  className,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode }[];
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(inline ? 'flex flex-wrap gap-x-6 gap-y-2' : 'space-y-2', className)}
    >
      {options.map((o) => (
        <Radio
          key={o.value}
          name={name}
          value={o.value}
          checked={value === o.value}
          onChange={() => onChange(o.value)}
          label={o.label}
          description={o.description}
        />
      ))}
    </div>
  );
}
