'use client';

/**
 * Dependency-free Code 39 barcode (SVG). Scannable, matches the demo's patient
 * header barcode. Code 39 covers 0-9 A-Z and a few symbols — enough for patientNo.
 */

// Each character → 9 elements (bar,space,…,bar); 'w' = wide, 'n' = narrow.
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

export function Barcode({ value, height = 44, className }: { value: string; height?: number; className?: string }) {
  const text = `*${value.toUpperCase().replace(/[^0-9A-Z\-. ]/g, '')}*`;
  const narrow = 2;
  const wide = narrow * 3;
  const gap = narrow; // inter-character gap

  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of text) {
    const pattern = CODE39[ch] ?? CODE39['*']!;
    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] === 'w' ? wide : narrow;
      if (i % 2 === 0) bars.push({ x, w }); // even index = bar (drawn)
      x += w;
    }
    x += gap;
  }
  const width = x;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Barcode ${value}`}
      preserveAspectRatio="none"
    >
      <rect width={width} height={height} fill="#fff" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#0f172a" />
      ))}
    </svg>
  );
}
