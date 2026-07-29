'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DASHBOARD_WIDGETS,
  type DashboardOverviewDto,
  type DashboardWidgetKey,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

/**
 * One request for the whole dashboard. The response is already scoped to the
 * caller's role — widgets the role may not see are absent, not empty.
 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get<DashboardOverviewDto>('/dashboard/overview'),
    // The figures are aggregates, not live telemetry; a short stale window
    // keeps tab-switching from re-running 13 aggregations on the server.
    staleTime: 60_000,
  });
}

/**
 * Whether a widget is present in this response.
 *
 * Reads `widgets` rather than testing the data field, so an empty widget and a
 * forbidden one stay distinguishable: a hospital with no beds configured should
 * show an empty Bed Occupancy card, while a role without `ipd:view` should show
 * no card at all.
 */
export function hasWidget(
  data: DashboardOverviewDto | undefined,
  key: DashboardWidgetKey,
): boolean {
  return !!data && data.widgets.includes(key);
}

export { DASHBOARD_WIDGETS };
