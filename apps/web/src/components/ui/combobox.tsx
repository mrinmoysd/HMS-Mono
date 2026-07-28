'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Searchable single-select.
 *
 * The app has several long `<Select>`s (medicines, charges, staff, TPAs) where
 * scrolling a native dropdown is the only way to find an option, plus two
 * bespoke search-selects (PatientSelect, StaffSelect) that reimplement this
 * behaviour. This is the shared version.
 *
 * Pass `onSearch` to filter server-side; otherwise filtering is local.
 */

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  disabled,
  clearable,
  loading,
  onSearch,
  className,
  id,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, option: ComboboxOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  loading?: boolean;
  /** Supply to filter remotely — local filtering is skipped when present. */
  onSearch?: (query: string) => void;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (onSearch || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q));
  }, [options, query, onSearch]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  function pick(o: ComboboxOption) {
    if (o.disabled) return;
    onChange(o.value, o);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const o = filtered[active];
      if (o) pick(o);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-control w-full items-center justify-between gap-2 rounded-sm border border-line bg-surface-1 px-3 text-left text-sm outline-none transition',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          disabled && 'cursor-not-allowed bg-surface-sunken opacity-70',
        )}
      >
        <span className={cn('truncate', !selected && 'text-fg-subtle')}>
          {selected?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange('', null);
              }}
              className="rounded-xs p-0.5 text-fg-subtle hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-fg-subtle transition', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-dropdown mt-1 overflow-hidden rounded-md border border-line bg-surface-2 shadow-lg">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                onSearch?.(e.target.value);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {loading && <li className="px-3 py-6 text-center text-sm text-fg-muted">Loading…</li>}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-fg-muted">{emptyText}</li>
            )}
            {!loading &&
              filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    disabled={o.disabled}
                    onClick={() => pick(o)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition',
                      i === active && 'bg-primary-soft',
                      o.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.description && (
                        <span className="block truncate text-xs text-fg-muted">{o.description}</span>
                      )}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
