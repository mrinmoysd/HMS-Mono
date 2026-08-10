import { dayKeyInZone, dayKeyOf } from './dates';

/**
 * The day key for a `@db.Date` column.
 *
 * These exist because attendance was filing Monday's check-ins under Sunday
 * for every hospital east of UTC: local midnight in Asia/Kolkata is 18:30 the
 * previous day in UTC, and a date column keeps the UTC part.
 */
describe('dayKeyInZone', () => {
  // 16:31 UTC on the 10th — evening in Kolkata, still morning in Los Angeles.
  const AT = new Date('2026-08-10T16:31:00.000Z');

  it('returns UTC midnight, so a date column stores the day unchanged', () => {
    expect(dayKeyInZone(AT, 'UTC').toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('keeps the local day for a zone ahead of UTC', () => {
    // 22:01 on the 10th in Kolkata — the same calendar day.
    expect(dayKeyInZone(AT, 'Asia/Kolkata').toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('keeps the local day for a zone behind UTC', () => {
    // 09:31 on the 10th in Los Angeles.
    expect(dayKeyInZone(AT, 'America/Los_Angeles').toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('rolls forward when the zone is already into the next day', () => {
    // 19:00 UTC on the 10th is 00:30 on the 11th in Kolkata.
    const late = new Date('2026-08-10T19:00:00.000Z');
    expect(dayKeyInZone(late, 'Asia/Kolkata').toISOString()).toBe('2026-08-11T00:00:00.000Z');
  });

  it('rolls back when the zone is still on the previous day', () => {
    // 02:00 UTC on the 10th is 19:00 on the 9th in Los Angeles.
    const early = new Date('2026-08-10T02:00:00.000Z');
    expect(dayKeyInZone(early, 'America/Los_Angeles').toISOString()).toBe('2026-08-09T00:00:00.000Z');
  });

  it('is stable across the local midnight boundary', () => {
    // 18:29 UTC is 23:59 on the 10th in Kolkata; 18:30 is 00:00 on the 11th.
    expect(dayKeyInZone(new Date('2026-08-10T18:29:00Z'), 'Asia/Kolkata').toISOString()).toBe('2026-08-10T00:00:00.000Z');
    expect(dayKeyInZone(new Date('2026-08-10T18:30:00Z'), 'Asia/Kolkata').toISOString()).toBe('2026-08-11T00:00:00.000Z');
  });

  it('falls back to the UTC day rather than throwing on an unknown zone', () => {
    expect(dayKeyInZone(AT, 'Mars/Olympus_Mons').toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});

describe('dayKeyOf', () => {
  it('passes a plain date through unchanged', () => {
    // What z.coerce.date() produces from "2026-08-10".
    expect(dayKeyOf(new Date('2026-08-10')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('strips the time from a full timestamp', () => {
    expect(dayKeyOf(new Date('2026-08-10T23:45:12.345Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('reads UTC parts, not local ones', () => {
    // The bug this replaced: reading local parts shifted the day for any
    // server not running in UTC.
    expect(dayKeyOf(new Date('2026-08-10T00:00:00.000Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});
