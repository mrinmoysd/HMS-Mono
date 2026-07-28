/**
 * Chart series colours.
 *
 * SVG `fill`/`stroke` attributes take a colour string, not a Tailwind class, so
 * charts can't use `fill-chart-1` the way the rest of the app uses tokens. These
 * helpers resolve the same `--chart-*` custom properties at use site, which
 * keeps charts on-palette and lets them follow a theme or dark-mode switch.
 *
 * The tokens are RGB channel triplets (`--chart-1: 40 85 138`), so a bare
 * `var(--chart-1)` is not a valid colour — it has to go through `rgb()`.
 */

export const CHART_SERIES_COUNT = 8;

/** `rgb(var(--chart-n))`, cycling if `i` runs past the palette. */
export function chartColor(i: number, alpha?: number): string {
  const n = (i % CHART_SERIES_COUNT) + 1;
  return alpha == null ? `rgb(var(--chart-${n}))` : `rgb(var(--chart-${n}) / ${alpha})`;
}

/** The full palette in order — for legends and fixed-series charts. */
export const CHART_SERIES: string[] = Array.from({ length: CHART_SERIES_COUNT }, (_, i) =>
  chartColor(i),
);
