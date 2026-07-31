'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { baseInput, invalidInput } from './input-chrome';

/**
 * DateInput — a calendar on our tokens, replacing `<input type="date">`.
 *
 * A native date input renders its calendar as browser chrome: Chrome draws its
 * own panel, Firefox draws a different one, and neither can be reached by CSS.
 * So the field looked themed until it was opened, at which point an unstyled
 * calendar appeared. Same class of problem as the native `<select>` popup.
 *
 * The value contract is unchanged: it reads and emits `yyyy-mm-dd`, and
 * `onChange` hands back an object with `target.value`, which is what every
 * caller destructures. That is what lets TextInput delegate here on
 * `type="date"` and fix all 55 date fields without editing a single one.
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** yyyy-mm-dd → local Date. Never `new Date(iso)`: that parses as UTC and can land on the previous day. */
function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local Date → yyyy-mm-dd, built from local parts for the same reason. */
function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** dd-mm-yyyy — how the reference screens print dates. */
function display(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface DateInputProps {
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  className?: string;
  min?: string | number;
  max?: string | number;
  placeholder?: string;
  'aria-label'?: string;
}

export function DateInput({
  value,
  onChange,
  name,
  id,
  disabled,
  readOnly,
  invalid,
  className,
  min,
  max,
  placeholder = 'dd-mm-yyyy',
  ...rest
}: DateInputProps) {
  const iso = String(value ?? '');
  const selected = parseISO(iso);

  const [open, setOpen] = useState(false);
  // The month the grid is showing, which is not necessarily the selected month.
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setCursor(selected ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, iso]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const minDate = typeof min === 'string' ? parseISO(min) : null;
  const maxDate = typeof max === 'string' ? parseISO(max) : null;

  /** The 6×7 grid, padded with the neighbouring months so weekdays line up. */
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  function emit(next: string) {
    onChange?.({
      target: { value: next, name: name ?? '' },
      currentTarget: { value: next, name: name ?? '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  }

  function pick(d: Date) {
    if (disabled || readOnly) return;
    if (minDate && d < minDate) return;
    if (maxDate && d > maxDate) return;
    emit(toISO(d));
    setOpen(false);
  }

  const today = new Date();

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={iso} />
      <button
        {...rest}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => !disabled && !readOnly && setOpen((v) => !v)}
        className={cn(
          baseInput,
          'py-control flex cursor-pointer items-center justify-between gap-2 text-left',
          invalid && invalidInput,
          className,
        )}
      >
        <span className={cn('truncate', !selected && 'text-fg-subtle')}>
          {selected ? display(selected) : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-fg-subtle" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 z-dropdown mt-1 w-[17.5rem] rounded-md border border-line bg-surface-2 p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
                {w}
              </div>
            ))}
            {days.map((d) => {
              const outside = d.getMonth() !== cursor.getMonth();
              const isSelected = selected ? sameDay(d, selected) : false;
              const isToday = sameDay(d, today);
              const blocked = (minDate && d < minDate) || (maxDate && d > maxDate);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={!!blocked}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => pick(d)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-sm text-sm transition',
                    outside && 'text-fg-subtle',
                    !isSelected && !blocked && 'hover:bg-primary-soft',
                    isToday && !isSelected && 'font-semibold text-primary ring-1 ring-inset ring-primary/30',
                    isSelected && 'bg-primary font-semibold text-primary-fg',
                    blocked && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-sm px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary-soft"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { emit(''); setOpen(false); }}
              className="rounded-sm px-2 py-1 text-xs text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
