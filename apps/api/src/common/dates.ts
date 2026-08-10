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
