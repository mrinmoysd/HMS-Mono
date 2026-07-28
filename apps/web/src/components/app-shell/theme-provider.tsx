'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Appearance preferences, persisted per browser.
 *
 * The CSS defaults (Slate palette, compact density, light mode) live in
 * globals.css, so an unconfigured browser renders correctly with no JS. This
 * provider only applies *overrides* — which is why `applyPrefs` removes the
 * attribute rather than setting it to the default value.
 */

export type ThemeName = 'slate' | 'meridian' | 'plum';
export type Density = 'compact' | 'comfortable';
export type Mode = 'light' | 'dark';

export const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'slate', label: 'Slate' },
  { value: 'meridian', label: 'Meridian' },
  { value: 'plum', label: 'Plum' },
];

export const DEFAULTS = { theme: 'slate' as ThemeName, density: 'compact' as Density, mode: 'light' as Mode };
export const STORAGE_KEY = 'sh-appearance';

interface Prefs {
  theme: ThemeName;
  density: Density;
  mode: Mode;
}

interface ThemeApi extends Prefs {
  setTheme: (t: ThemeName) => void;
  setDensity: (d: Density) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

/**
 * Kept in sync with the inline no-FOUC script in app/layout.tsx — if the
 * attribute names change, change them in both places.
 */
function applyPrefs(p: Prefs) {
  const el = document.documentElement;
  if (p.theme === DEFAULTS.theme) el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', p.theme);
  if (p.density === DEFAULTS.density) el.removeAttribute('data-density');
  else el.setAttribute('data-density', p.density);
  el.classList.toggle('dark', p.mode === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Read once on mount. The inline script has already painted the right theme;
  // this just syncs React state so the toggles show the correct current value.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) });
    } catch {
      /* corrupt or unavailable storage — fall back to defaults */
    }
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode — preference just won't persist */
      }
      return next;
    });
  }, []);

  const api = useMemo<ThemeApi>(
    () => ({
      ...prefs,
      setTheme: (theme) => update({ theme }),
      setDensity: (density) => update({ density }),
      setMode: (mode) => update({ mode }),
      toggleMode: () => update({ mode: prefs.mode === 'dark' ? 'light' : 'dark' }),
    }),
    [prefs, update],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
