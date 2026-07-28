'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListQuery,
  Paginated,
  TpaChargeImportInput,
  TpaChargeImportResult,
  TpaChargeRowDto,
  TpaDto,
  TpaInput,
  TpaReportResult,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── TPA CRUD ─────────────────────────────────────────────────
export function useTpaList(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['tpas', params], queryFn: () => api.get<Paginated<TpaDto>>(`/tpas?${qs({ size: 100, ...params })}`) });
}
export function useTpaDetail(id: string | null) {
  return useQuery({ queryKey: ['tpas', 'detail', id], queryFn: () => api.get<TpaDto>(`/tpas/${id}`), enabled: !!id });
}
export function useCreateTpa() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: TpaInput) => api.post<TpaDto>('/tpas', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['tpas'] }) });
}
export function useUpdateTpa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TpaInput }) => api.patch<TpaDto>(`/tpas/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tpas'] }),
  });
}
export function useDeleteTpa() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/tpas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['tpas'] }) });
}

// ── TPA charge schedule ──────────────────────────────────────
export function useTpaCharges(id: string | null, module: string) {
  return useQuery({
    queryKey: ['tpa-charges', id, module],
    queryFn: () => api.get<TpaChargeRowDto[]>(`/tpas/${id}/charges?${qs({ module })}`),
    enabled: !!id,
  });
}
export function useSetTpaCharge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeId, amount }: { chargeId: string; amount: number }) => api.put<TpaChargeRowDto>(`/tpas/${id}/charges/${chargeId}`, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tpa-charges', id] }),
  });
}
export function useDeleteTpaCharge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) => api.delete<void>(`/tpas/${id}/charges/${chargeId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tpa-charges', id] }),
  });
}
export function useImportTpaCharges(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TpaChargeImportInput) => api.post<TpaChargeImportResult>(`/tpas/${id}/charges/import`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tpa-charges', id] }),
  });
}

// ── TPA Report ───────────────────────────────────────────────
export interface TpaReportQuery {
  from?: string;
  to?: string;
  doctorId?: string;
  tpaId?: string;
  caseId?: string;
  chargeCategoryId?: string;
  chargeId?: string;
}
export function useTpaReport(query: TpaReportQuery | null) {
  return useQuery({
    queryKey: ['tpa-report', query],
    queryFn: () => api.get<TpaReportResult>(`/tpas/report?${qs({ ...query })}`),
    enabled: !!query,
  });
}
