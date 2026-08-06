import { ALL_REPORT_KEYS, FEATURES, Ability } from '@smart-hospital/shared';
import type { FeaturePermissionKey } from '@smart-hospital/shared';
import { MAPPED_REPORTS, reportFeature, visibleReportCategories } from './reports-features';

describe('reportFeature', () => {
  it('maps every report in the catalogue', () => {
    expect(ALL_REPORT_KEYS.filter((k) => !MAPPED_REPORTS[k])).toEqual([]);
  });

  it('points every report at a feature key that exists', () => {
    const known = new Set(FEATURES.map((f) => f.key));
    expect(Object.entries(MAPPED_REPORTS).filter(([, k]) => !known.has(k))).toEqual([]);
  });

  it('denies an unknown key rather than falling through', () => {
    expect(reportFeature('made-up')).toBeNull();
  });

  it('shows a user only the reports they can run', () => {
    const ability = new Ability([], ['reports.opd_report:view'] as FeaturePermissionKey[]);
    const visible = visibleReportCategories(ability);
    // One category, one report — not the whole menu.
    expect(visible.flatMap((c) => c.reports.map((r) => r.key))).toEqual(['opd']);
  });

  it('drops categories that end up empty rather than showing a bare heading', () => {
    const ability = new Ability([], [] as FeaturePermissionKey[]);
    expect(visibleReportCategories(ability)).toEqual([]);
  });
});
