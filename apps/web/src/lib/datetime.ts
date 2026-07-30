/**
 * Local-time helpers for `<input type="datetime-local">` / `type="date"`.
 *
 * Never use `iso.slice(0, 10)` or `toISOString().slice(...)` to fill a date
 * input. Those read the *UTC* calendar date off the timestamp, which is a
 * different day from the user's for most of the world — in IST an appointment
 * at 30 Jul 00:00 is stored `2026-07-29T18:30Z`, so slicing yields 29 Jul and
 * the picker silently shows (and on save, writes) the wrong day.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm` in the viewer's timezone — for `datetime-local` inputs. */
export function toLocalDateTimeInput(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `YYYY-MM-DD` in the viewer's timezone — for `date` inputs. */
export function toLocalDateInput(value: string | Date): string {
  return toLocalDateTimeInput(value).slice(0, 10);
}

/** Now, as a `datetime-local` value. */
export function nowLocalDateTimeInput(): string {
  return toLocalDateTimeInput(new Date());
}

/**
 * A `datetime-local` value carries no zone, so sending it raw lets the server
 * parse it as UTC. Resolve it against the browser's zone first, so "30 Jul
 * 09:00" means 09:00 where the user is standing.
 */
export function localInputToIso(value: string): string {
  if (!value) return '';
  const d = new Date(value); // no trailing Z → parsed as local time
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}
