'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Compact trend line with an optional filled area.
 *
 * Hand-rolled SVG, matching credit-donut.tsx and branch-pie.tsx — this app has
 * no charting library and one sparkline is not a reason to add one.
 *
 * Colour comes in as a CSS colour string (typically `rgb(var(--primary))`)
 * rather than a Tailwind class, because SVG stroke/fill take a colour value and
 * cannot use utility classes. See lib/chart-colors.ts for the same reasoning.
 */
export function Sparkline({
  points,
  color = 'rgb(var(--primary))',
  filled = true,
  className,
  height = 40,
  strokeWidth = 1.75,
  ariaLabel,
}: {
  points: number[];
  color?: string;
  filled?: boolean;
  className?: string;
  height?: number;
  strokeWidth?: number;
  ariaLabel?: string;
}) {
  const gradientId = useId();

  // Fixed viewBox with preserveAspectRatio="none": the path is authored in a
  // 100×H space and the browser stretches it to whatever width the card gives
  // us, so the component never needs to measure itself.
  const W = 100;
  const H = height;
  const pad = strokeWidth; // keep the stroke from clipping at the edges

  if (points.length === 0) {
    return <div className={cn('h-10', className)} aria-hidden />;
  }

  // A single point has no line to draw; render it as a flat mid-height run so
  // the card still shows a baseline instead of collapsing.
  const series = points.length === 1 ? [points[0]!, points[0]!] : points;

  const min = Math.min(...series);
  const max = Math.max(...series);
  // All-equal series are very common here (a fortnight of zeroes). Scaling them
  // normally would divide by zero, and pinning them to `min` would draw the line
  // flat on the bottom edge where the card border swallows it — so draw a flat
  // run through the middle instead, which reads as "no movement" rather than
  // "no data".
  const flat = max === min;
  const span = flat ? 1 : max - min;

  const x = (i: number): number => (i / (series.length - 1)) * W;
  const y = (v: number): number =>
    flat ? H / 2 : H - pad - ((v - min) / span) * (H - pad * 2);

  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height: H }}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        // The viewBox is stretched horizontally, which would smear the stroke
        // into a wedge; this keeps it an even weight at any card width.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
