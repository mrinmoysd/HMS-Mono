import { BUILDER_REPORT_KEYS, REPORT_CATEGORIES } from '@smart-hospital/shared';
import { ReportsService } from './reports.service';
import { MAPPED_REPORTS } from './reports-features';

/**
 * The catalogue is what the Reports menu renders, and it is filtered only by
 * permission — not by whether the report can actually run. So a key added to
 * the catalogue without a builder becomes a menu entry that 400s when clicked,
 * for exactly the users entitled to use it.
 *
 * These tests are the link that was missing: `ReportsService.keys()` existed
 * but nothing called it, so nothing noticed the gap.
 */
describe('report catalogue coverage', () => {
  // The service is only being asked which builders it holds, and `builders` is
  // a plain field initialiser — no query runs, so the deps can be empty.
  const service = new ReportsService({} as never, {} as never);
  const built = new Set(service.keys());

  it('has a builder for every report that claims to be generic', () => {
    expect(BUILDER_REPORT_KEYS.filter((k) => !built.has(k))).toEqual([]);
  });

  it('has no builder stranded outside the catalogue', () => {
    const inCatalogue = new Set(BUILDER_REPORT_KEYS);
    expect([...built].filter((k) => !inCatalogue.has(k))).toEqual([]);
  });

  it('gives every bespoke report an href and no builder', () => {
    const bespoke = REPORT_CATEGORIES.flatMap((c) => c.reports).filter((r) => r.href);
    expect(bespoke.length).toBeGreaterThan(0);
    // An href *and* a builder would be two ways to open the same report that
    // could disagree; the catalogue must pick one.
    expect(bespoke.filter((r) => built.has(r.key)).map((r) => r.key)).toEqual([]);
    expect(bespoke.filter((r) => !r.href?.startsWith('/')).map((r) => r.key)).toEqual([]);
  });

  it('gates every report, generic or bespoke, on a feature', () => {
    const all = REPORT_CATEGORIES.flatMap((c) => c.reports);
    expect(all.filter((r) => !MAPPED_REPORTS[r.key]).map((r) => r.key)).toEqual([]);
  });

  it('uses each report key exactly once across categories', () => {
    const keys = REPORT_CATEGORIES.flatMap((c) => c.reports.map((r) => r.key));
    expect(keys.length).toBe(new Set(keys).size);
  });
});
