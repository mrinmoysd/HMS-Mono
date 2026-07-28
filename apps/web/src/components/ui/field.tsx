'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Form field primitives. 93 files import these, so every existing prop keeps
 * its exact meaning — the additions (`hint`, `invalid`, `leftIcon`) are all
 * optional. See docs/UI_SYSTEM_PLAN.md §5.2.
 */

/** Shared control chrome. Height comes from the density token, not a literal. */
const baseInput =
  'w-full rounded-sm border border-line bg-surface-1 px-3 text-sm text-fg outline-none transition ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted';

const invalidInput = 'border-danger focus:border-danger focus:ring-danger/20';

export function FieldLabel({
  label,
  required,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {label}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

interface FieldWrapProps {
  label: string;
  required?: boolean;
  error?: string;
  /** Helper text shown under the control; hidden while an error is displayed. */
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, error, hint, htmlFor, className, children }: FieldWrapProps) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} htmlFor={htmlFor} />
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Leading adornment, e.g. a search or currency icon. */
  leftIcon?: React.ComponentType<{ className?: string }>;
}

export function TextInput({ invalid, leftIcon: Icon, className, ...props }: InputProps) {
  const input = (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(baseInput, 'py-control', Icon && 'pl-9', invalid && invalidInput, className)}
    />
  );
  if (!Icon) return input;
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
      {input}
    </div>
  );
}

export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={3}
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(baseInput, 'py-2 leading-relaxed', invalid && invalidInput, className)}
    />
  );
}

export function Select({
  options,
  placeholder,
  invalid,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        {...props}
        aria-invalid={invalid || undefined}
        className={cn(
          baseInput,
          'py-control cursor-pointer appearance-none pr-9',
          invalid && invalidInput,
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}
