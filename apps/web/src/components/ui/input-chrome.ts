/**
 * The shared chrome for text-like controls.
 *
 * Extracted from field.tsx so DateInput can wear the same shell without
 * importing from field.tsx, which imports DateInput back — a cycle Next's
 * client bundler resolves inconsistently.
 */

/** Height comes from the density token, not a literal. */
export const baseInput =
  'w-full rounded-sm border border-line bg-surface-1 px-3 text-sm text-fg outline-none transition ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted';

export const invalidInput = 'border-danger focus:border-danger focus:ring-danger/20';
