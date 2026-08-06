import { hospitalSettings } from './hospital-settings';

/**
 * Date, time and money rendering, honouring Setup ▸ Settings ▸ General.
 *
 * Before this existed the app called `toLocaleDateString()` in ~40 files and
 * `toFixed(2)` in ~57, so the Date Format, Time Format, Time Zone, Currency and
 * Currency Symbol settings were stored and then ignored — the form accepted a
 * choice and nothing downstream honoured it.
 *
 * ── Why not `toLocaleDateString(locale)` ─────────────────────────────────────
 * The setting is an explicit pattern (`dd/mm/yyyy`), not a locale. Mapping
 * patterns onto locales is lossy: no locale means exactly "dd-mm-yyyy", and
 * picking the nearest one silently gives a different separator or order. So the
 * parts come from `Intl.DateTimeFormat` — which is what correctly applies the
 * configured **time zone** — and this assembles them in the configured order.
 */

const TWO = '2-digit' as const;

function parts(d: Date): { day: string; month: string; year: string } {
  const { timeZone } = hospitalSettings();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: safeZone(timeZone),
    day: TWO,
    month: TWO,
    year: 'numeric',
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return { day: out.day ?? '', month: out.month ?? '', year: out.year ?? '' };
}

/**
 * An unknown zone makes `Intl.DateTimeFormat` throw, which would take down
 * every screen that renders a date. A bad setting should degrade to the
 * viewer's own zone, not to a blank page.
 */
function safeZone(zone: string): string | undefined {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format(new Date());
    return zone;
  } catch {
    return undefined;
  }
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A date in the configured format and zone. Empty input renders as an em dash. */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  const { day, month, year } = parts(d);
  switch (hospitalSettings().dateFormat) {
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`;
    case 'dd/mm/yyyy':
    default:
      return `${day}/${month}/${year}`;
  }
}

/** A time in the configured 12/24-hour format and zone. */
export function formatTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  const s = hospitalSettings();
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: safeZone(s.timeZone),
    hour: TWO,
    minute: TWO,
    hour12: s.timeFormat === '12 Hour',
  }).format(d);
}

/** Date and time together, both in the configured formats. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * An amount with the configured currency symbol and thousands separators.
 *
 * The symbol is applied verbatim rather than via `Intl`'s `currency` style,
 * because the setting is a free-text symbol (`₹`, `$`, `Rs.`) paired with a
 * free-text code — `Intl` would reject anything that is not a valid ISO 4217
 * code and take the screen down with it.
 */
export function money(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const body = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${hospitalSettings().currencySymbol}${body}`;
}

/**
 * The amount with no symbol — for table cells that carry the currency in the
 * column header, and for CSV exports where a symbol would break a spreadsheet's
 * number parsing.
 */
export function amount(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(2);
}

/** The configured symbol, for column headers like `Amount (₹)`. */
export function currencySymbol(): string {
  return hospitalSettings().currencySymbol;
}
