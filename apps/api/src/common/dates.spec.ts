import { dayKeyInZone, dayKeyOf, zonedDayBounds } from './dates';

describe('zonedDayBounds', () => {
  it('bounds a day in a +offset zone, not the server’s', () => {
    const { start, end } = zonedDayBounds('2026-08-11', 'Asia/Kolkata');
    // IST is UTC+5:30, so the 11th locally starts at 18:30Z on the 10th.
    expect(start.toISOString()).toBe('2026-08-10T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-08-11T18:29:59.999Z');
  });

  it('bounds a day in a -offset zone', () => {
    const { start, end } = zonedDayBounds('2026-08-11', 'America/New_York');
    // EDT is UTC-4 in August.
    expect(start.toISOString()).toBe('2026-08-11T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-12T03:59:59.999Z');
  });

  it('is exactly one day wide, less a millisecond', () => {
    for (const zone of ['UTC', 'Asia/Kolkata', 'America/New_York', 'Australia/Adelaide']) {
      const { start, end } = zonedDayBounds('2026-08-11', zone);
      expect(end.getTime() - start.getTime()).toBe(86_400_000 - 1);
    }
  });

  it('lands on the right side of a DST transition', () => {
    // US clocks go forward on 2026-03-08, making that local day 23h long.
    const { start, end } = zonedDayBounds('2026-03-08', 'America/New_York');
    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-09T03:59:59.999Z');
    // 23 hours, not 24 — the hour that does not exist is not in the range.
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000 - 1);
  });

  it('falls back to UTC rather than throwing on a bad zone', () => {
    const { start, end } = zonedDayBounds('2026-08-11', 'Not/AZone');
    expect(start.toISOString()).toBe('2026-08-11T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-11T23:59:59.999Z');
  });

  it('does not overlap the neighbouring day', () => {
    const a = zonedDayBounds('2026-08-11', 'Asia/Kolkata');
    const b = zonedDayBounds('2026-08-12', 'Asia/Kolkata');
    expect(a.end.getTime()).toBeLessThan(b.start.getTime());
    expect(b.start.getTime() - a.end.getTime()).toBe(1);
  });
});

describe('dayKeyInZone / dayKeyOf', () => {
  it('keys the local day, not the UTC one', () => {
    // 19:00Z on the 10th is already the 11th in Kolkata.
    const at = new Date('2026-08-10T19:00:00.000Z');
    expect(dayKeyInZone(at, 'Asia/Kolkata').toISOString()).toBe('2026-08-11T00:00:00.000Z');
    expect(dayKeyInZone(at, 'UTC').toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('normalises a client-supplied date without shifting it', () => {
    expect(dayKeyOf(new Date('2026-08-11T00:00:00.000Z')).toISOString()).toBe(
      '2026-08-11T00:00:00.000Z',
    );
  });
});
