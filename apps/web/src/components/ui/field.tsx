'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { baseInput, invalidInput } from './input-chrome';
import { DateInput } from './date-input';

/**
 * Form field primitives. 93 files import these, so every existing prop keeps
 * its exact meaning — the additions (`hint`, `invalid`, `leftIcon`) are all
 * optional. See docs/UI_SYSTEM_PLAN.md §5.2.
 */


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
  // A native date input's calendar is browser chrome and cannot be styled, so
  // `type="date"` is served by our own DateInput. Routing it here rather than at
  // the call sites means all 55 date fields are themed without being edited.
  if (props.type === 'date') {
    const { type: _type, ...date } = props;
    return <DateInput {...date} invalid={invalid} className={className} />;
  }

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

/**
 * Select — a listbox, not a native `<select>`.
 *
 * A native select renders its option list as OS chrome: the popup ignores the
 * palette, the density tokens and the dark theme entirely, and no CSS can reach
 * it. That is why every dropdown in the app looked unstyled the moment it was
 * opened, however carefully the closed control was themed.
 *
 * The props are unchanged, so all 162 call sites keep working untouched. In
 * particular `onChange` still receives an object with `target.value` — every
 * caller reads exactly that — so the synthetic event below is enough. A hidden
 * input carries `name`/`value` for anything that reads the DOM.
 *
 * Trade-off worth knowing: this gives up the native picker on touch devices.
 * For a desktop admin console that is the right side of the trade, and the
 * listbox is still usable by touch, but it is a deliberate choice not an
 * oversight.
 */
export function Select({
  options,
  placeholder,
  invalid,
  className,
  disabled,
  value,
  onChange,
  name,
  id,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const current = String(value ?? '');
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Open on the current selection so keyboard users start where they left off.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function pick(optionValue: string) {
    setOpen(false);
    // Callers all do `onChange={(e) => set(e.target.value)}`; give them exactly
    // that shape rather than pretending to be a full DOM event.
    onChange?.({
      target: { value: optionValue, name: name ?? '' },
      currentTarget: { value: optionValue, name: name ?? '' },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[active];
      if (o) pick(o.value);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={current} />
      <button
        type="button"
        id={id}
        aria-label={props['aria-label']}
        title={props.title}
        autoFocus={props.autoFocus}
        tabIndex={props.tabIndex}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          baseInput,
          'py-control flex cursor-pointer items-center justify-between gap-2 pr-3 text-left',
          invalid && invalidInput,
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-fg-subtle')}>
          {selected ? selected.label : placeholder ?? 'Select…'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-fg-subtle transition', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-dropdown mt-1 max-h-60 overflow-y-auto rounded-md border border-line bg-surface-2 py-1 shadow-lg"
        >
          {placeholder && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={current === ''}
                onClick={() => pick('')}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-fg-muted transition hover:bg-primary-soft',
                )}
              >
                {placeholder}
              </button>
            </li>
          )}
          {options.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">No options</li>
          )}
          {options.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === current}
                onClick={() => pick(o.value)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition',
                  i === active && 'bg-primary-soft',
                  o.value === current && 'font-medium text-primary',
                )}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {o.value === current && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
