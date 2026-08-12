/** Day boundaries used by the Today/Upcoming/Old tab filters. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * The calendar day containing `at` in `zone`, as UTC midnight of that day.
 *
 * This is the right value for a Postgres `@db.Date` column, which stores no
 * time and no offset. Passing local midnight instead loses a day for every
 * hospital east of UTC: in Asia/Kolkata, midnight on the 10th is
 * `2026-08-09T18:30Z`, and the date column keeps the UTC part — the 9th. Staff
 * who clocked in on Monday were filed under Sunday.
 *
 * `startOfToday` is unchanged and still correct for its own callers, which
 * compare against `DateTime` columns rather than keying a `Date` one.
 */
export function dayKeyInZone(at: Date, zone: string): Date {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the key we want.
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
    return new Date(`${ymd}T00:00:00.000Z`);
  } catch {
    // An unknown timezone must not break a check-in.
    return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  }
}

/**
 * A date the client picked, normalised to UTC midnight.
 *
 * `z.coerce.date()` turns "2026-08-10" into `2026-08-10T00:00:00Z`, so the UTC
 * parts already name the intended day. Reading local parts would shift it.
 */
export function dayKeyOf(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/**
 * How far `zone` is from UTC at a given instant, in milliseconds.
 *
 * Formatting the instant in the zone and then reading those wall-clock parts
 * back as if they were UTC gives the offset by subtraction. This is the only
 * approach that stays right across DST without a timezone library.
 */
function zoneOffsetMs(at: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // Some ICU versions render midnight as hour 24 under hour12:false.
  const hour = get('hour') % 24;
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  // The formatter has no millisecond field, so compare against `at` truncated
  // to the same precision — otherwise every offset comes back short by however
  // many milliseconds `at` carried, and the end of a range lands a second late.
  return asUtc - (at.getTime() - at.getMilliseconds());
}

/**
 * The instants bounding a calendar day in `zone`, for filtering `DateTime`
 * columns against a date the user picked.
 *
 * The naive version of this — `new Date(to)` then `setHours(23,59,59,999)` —
 * is wrong twice over. `new Date('2026-08-11')` is UTC midnight, and
 * `setHours` then shifts it by the *server's* offset, which has nothing to do
 * with the hospital's. A hospital in Asia/Kolkata asking for "up to the 11th"
 * got a window running 05:30 into the 12th. Same defect class as the
 * attendance day-key bug: a date is not an instant until you say whose day it
 * is.
 *
 * Resolved by guessing the offset at the UTC reading of the wall clock, then
 * re-reading it at the corrected instant — the second pass is what makes a
 * range that starts or ends across a DST boundary land on the right side of
 * it.
 */
export function zonedDayBounds(ymd: string, zone: string): { start: Date; end: Date } {
  const wall = (h: number, m: number, s: number, ms: number) => {
    const naive = new Date(`${ymd}T00:00:00.000Z`).getTime() + ((h * 60 + m) * 60 + s) * 1000 + ms;
    const guess = naive - zoneOffsetMs(new Date(naive), zone);
    return new Date(naive - zoneOffsetMs(new Date(guess), zone));
  };
  try {
    return { start: wall(0, 0, 0, 0), end: wall(23, 59, 59, 999) };
  } catch {
    // An unknown timezone must not make a report unrunnable; fall back to UTC.
    return {
      start: new Date(`${ymd}T00:00:00.000Z`),
      end: new Date(`${ymd}T23:59:59.999Z`),
    };
  }
}
