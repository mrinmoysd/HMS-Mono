import type { Config } from 'tailwindcss';

/**
 * Meridian design system — see docs/UI_SYSTEM_PLAN.md §2.
 *
 * Every colour resolves to a CSS variable defined in src/app/globals.css, in
 * `R G B` channel form so the `/<alpha-value>` variants (`bg-primary/10`) work.
 * The legacy names (bg / surface / border / primary / fg …) are kept verbatim
 * because ~108 components reference them; the new role names sit alongside.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── legacy names — still referenced app-wide, do not remove ── */
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        occupied: 'rgb(var(--occupied) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',

        /* ── new semantic roles ── */
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        'surface-1': 'rgb(var(--surface-1) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--fg-subtle) / <alpha-value>)',

        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        'primary-active': 'rgb(var(--primary-active) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',

        'success-soft': 'rgb(var(--success-soft) / <alpha-value>)',
        'success-fg': 'rgb(var(--success-fg) / <alpha-value>)',
        'warning-soft': 'rgb(var(--warning-soft) / <alpha-value>)',
        'warning-fg': 'rgb(var(--warning-fg) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        'danger-fg': 'rgb(var(--danger-fg) / <alpha-value>)',
        'info-soft': 'rgb(var(--info-soft) / <alpha-value>)',
        'info-fg': 'rgb(var(--info-fg) / <alpha-value>)',
        'occupied-soft': 'rgb(var(--occupied-soft) / <alpha-value>)',

        focus: 'rgb(var(--focus) / <alpha-value>)',
      },

      /* Softer than the old 6/8/12 — a core part of the new visual language. */
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },

      /* Paired line-heights; headings pulled in slightly for a calmer scale.
         `sm` stays at 14px — it is the table/body workhorse. */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.375rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem' }],
        xl: ['1.1875rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.125rem' }],
      },

      fontFamily: {
        sans: ['var(--font-sans, Inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono, ui-monospace)', 'SFMono-Regular', 'monospace'],
      },

      /* Layered and low-opacity — no hard drop shadows. */
      boxShadow: {
        xs: '0 1px 2px 0 rgb(var(--fg) / 0.05)',
        sm: '0 1px 2px 0 rgb(var(--fg) / 0.04), 0 1px 3px 0 rgb(var(--fg) / 0.06)',
        md: '0 2px 4px -1px rgb(var(--fg) / 0.05), 0 4px 12px -2px rgb(var(--fg) / 0.08)',
        lg: '0 4px 8px -2px rgb(var(--fg) / 0.06), 0 12px 28px -4px rgb(var(--fg) / 0.12)',
        xl: '0 8px 16px -4px rgb(var(--fg) / 0.08), 0 24px 48px -8px rgb(var(--fg) / 0.16)',
        focus: '0 0 0 3px rgb(var(--focus) / 0.22)',
        none: 'none',
      },

      /* Replaces the uniform `z-50` used by every overlay today, which is why
         popovers inside modals currently clip. */
      zIndex: {
        sticky: '10',
        dropdown: '40',
        overlay: '50',
        modal: '60',
        popover: '70',
        toast: '80',
      },

      transitionDuration: {
        fast: '120ms',
        DEFAULT: '180ms',
        slow: '240ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'zoom-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms cubic-bezier(0.2, 0, 0, 1)',
        'zoom-in': 'zoom-in 180ms cubic-bezier(0.3, 0, 0, 1)',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.3, 0, 0, 1)',
        'slide-up': 'slide-up 180ms cubic-bezier(0.3, 0, 0, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },

      ringColor: { DEFAULT: 'rgb(var(--focus))' },
      outlineColor: { DEFAULT: 'rgb(var(--focus))' },
    },
  },
  plugins: [],
};

export default config;
