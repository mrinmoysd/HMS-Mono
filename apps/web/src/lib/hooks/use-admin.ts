'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BranchDto, BranchInput, BranchOverviewDto, BranchUpdateInput, CmsBannerDto, CmsBannerInput, CmsMenuDto, CmsMenuInput,
  CmsPageDto, CmsPageInput, ListQuery, Paginated, ReportResult,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

// ── Reports ──────────────────────────────────────────────────
export function useReportCategories() {
  return useQuery({ queryKey: ['report-categories'], queryFn: () => api.get<{ category: string; reports: { key: string; label: string }[] }[]>('/reports/categories') });
}
export function useReport(key: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['report', key, from, to],
    queryFn: () => api.get<ReportResult>(`/reports/${key}?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}`),
    enabled: !!key,
  });
}

// ── Multi-Branch ─────────────────────────────────────────────
export function useBranches() {
  return useQuery({ queryKey: ['branches'], queryFn: () => api.get<BranchDto[]>('/multibranch/branches') });
}
export function useBranchOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['branch-overview', from, to],
    queryFn: () => api.get<BranchOverviewDto>(`/multibranch/overview?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}`),
  });
}
export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: BranchInput) => api.post<BranchDto>('/multibranch/branches', i), onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); qc.invalidateQueries({ queryKey: ['branch-overview'] }); } });
}
export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BranchUpdateInput }) => api.patch<BranchDto>(`/multibranch/branches/${id}`, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); qc.invalidateQueries({ queryKey: ['branch-overview'] }); },
  });
}
export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/multibranch/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); qc.invalidateQueries({ queryKey: ['branch-overview'] }); },
  });
}

/** Multi Branch's own flat Report card grid — 19 entries matching the demo exactly. */
export const MULTI_BRANCH_REPORTS: { key: string; label: string }[] = [
  { key: 'appointment', label: 'Appointment Report' },
  { key: 'opd', label: 'OPD Report' },
  { key: 'ipd', label: 'IPD Report' },
  { key: 'ot', label: 'OT Report' },
  { key: 'pharmacy', label: 'Pharmacy Report' },
  { key: 'medicine-expiry', label: 'Medicine Expiry Report' },
  { key: 'pathology', label: 'Pathology Report' },
  { key: 'radiology', label: 'Radiology Report' },
  { key: 'blood-issue', label: 'Blood Issue Report' },
  { key: 'component-issue', label: 'Component Issue Report' },
  { key: 'blood-donor', label: 'Blood Donor Report' },
  { key: 'ambulance', label: 'Ambulance Report' },
  { key: 'birth', label: 'Birth Report' },
  { key: 'payroll', label: 'Payroll Report' },
  { key: 'finance-income', label: 'Income Report' },
  { key: 'finance-expense', label: 'Expense Report' },
  { key: 'live', label: 'Live Consultation Report' },
  { key: 'transaction', label: 'Transaction Report' },
  { key: 'death', label: 'Death Report' },
];

// ── Front CMS ────────────────────────────────────────────────
export function useCmsPages(params: Partial<ListQuery>) {
  return useQuery({ queryKey: ['cms-pages', params], queryFn: () => api.get<Paginated<CmsPageDto>>(`/cms/pages?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString()}`) });
}
export function useCreateCmsPage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CmsPageInput) => api.post<CmsPageDto>('/cms/pages', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-pages'] }) });
}
export function useCmsBanners() {
  return useQuery({ queryKey: ['cms-banners'], queryFn: () => api.get<CmsBannerDto[]>('/cms/banners') });
}
export function useCreateCmsBanner() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CmsBannerInput) => api.post<CmsBannerDto>('/cms/banners', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-banners'] }) });
}
export function useCmsMenus() {
  return useQuery({ queryKey: ['cms-menus'], queryFn: () => api.get<CmsMenuDto[]>('/cms/menus') });
}
export function useCreateCmsMenu() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CmsMenuInput) => api.post<CmsMenuDto>('/cms/menus', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-menus'] }) });
}
