'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 102 files import this. The four original variants and two sizes keep their
 * exact names and meanings; `outline`, `subtle`, `link`, `lg` and `icon` are
 * additions, so no existing call site has to change.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover active:bg-primary-active',
  secondary: 'border border-line bg-surface-1 text-fg shadow-xs hover:bg-surface-sunken',
  ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
  danger: 'bg-danger text-danger-fg shadow-xs hover:opacity-90',
  outline: 'border border-primary/40 bg-primary-soft text-primary hover:border-primary',
  subtle: 'bg-surface-sunken text-fg hover:bg-line/60',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizes: Record<Size, string> = {
  sm: 'h-control-sm px-2.5 text-xs',
  md: 'h-control px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-control aspect-square p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition',
        'disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        // `link` reads as text, not as a control with a fixed height.
        variant === 'link' && 'h-auto px-0 shadow-none',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

/**
 * Square icon-only button for the row action clusters (view/edit/print/delete)
 * on every list. Those are currently hand-rolled as
 * `<button className="flex h-7 w-7 items-center justify-center rounded-sm …">`
 * with a bare `title` and inconsistent hover colours.
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Accessible name — also used as the tooltip. */
    label: string;
    tone?: 'default' | 'primary' | 'danger';
    size?: 'sm' | 'md';
  }
>(function IconButton({ label, tone = 'default', size = 'md', className, children, ...props }, ref) {
  const tones = {
    default: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
    primary: 'text-fg-muted hover:bg-primary-soft hover:text-primary',
    danger: 'text-fg-muted hover:bg-danger-soft hover:text-danger',
  };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm border border-line transition',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
