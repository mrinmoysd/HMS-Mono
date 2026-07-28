'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dependency-free disclosure menu (native <details>). Items close the menu on click.
 *
 * Now also closes on outside click and on Escape — previously an opened menu
 * stayed open until one of its own items was clicked, so two menus could be
 * open at once.
 */
export function Menu({
  trigger,
  children,
  align = 'right',
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(e: Event) {
      const el = ref.current;
      if (!el?.open) return;
      if (e.type === 'keydown') {
        if ((e as KeyboardEvent).key === 'Escape') el.removeAttribute('open');
        return;
      }
      if (!el.contains(e.target as Node)) el.removeAttribute('open');
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <details ref={ref} className={cn('group relative', className)}>
      <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
        {trigger}
      </summary>
      <div
        className={cn(
          'absolute z-dropdown mt-1 min-w-[10rem] overflow-hidden rounded-md border border-line bg-surface-2 py-1 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </div>
    </details>
  );
}

export function MenuItem({
  onClick,
  children,
  icon: Icon,
  tone = 'default',
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.currentTarget.closest('details')?.removeAttribute('open');
        onClick();
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition disabled:pointer-events-none disabled:opacity-50',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-soft'
          : 'hover:bg-surface-sunken',
      )}
    >
      {Icon && (
        <Icon className={cn('h-4 w-4', tone === 'danger' ? 'text-danger' : 'text-fg-muted')} />
      )}
      {children}
    </button>
  );
}
