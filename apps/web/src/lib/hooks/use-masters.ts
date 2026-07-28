'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CatalogItemDto,
  ChargeDetailDto,
  ChargeDto,
  ChargeInput,
  ChargeScheduleEntryDto,
  ChargeScheduleUpdateInput,
  ChargeTypeDto,
  ChargeTypeInput,
  ListQuery,
  Paginated,
  TaxCategoryDto,
  TaxCategoryInput,
  TpaDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function useTpas() {
  return useQuery({
    queryKey: ['tpas'],
    queryFn: () => api.get<Paginated<TpaDto>>('/tpas?size=100'),
  });
}

function qs(p: Partial<ListQuery>): string {
  const sp = new URLSearchParams();
  if (p.search) sp.set('search', p.search);
  if (p.page) sp.set('page', String(p.page));
  if (p.size) sp.set('size', String(p.size));
  return sp.toString();
}

/** Simple name-catalog (charge-category, charge-type, unit-type). */
export function useCatalog(catalog: string, params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['catalog', catalog, params],
    queryFn: () => api.get<Paginated<CatalogItemDto>>(`/masters/${catalog}?${qs(params)}`),
  });
}

export function useCreateCatalogItem(catalog: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<CatalogItemDto>(`/masters/${catalog}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', catalog] }),
  });
}

export function useUpdateCatalogItem(catalog: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<CatalogItemDto>(`/masters/${catalog}/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', catalog] }),
  });
}

export function useDeleteCatalogItem(catalog: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/masters/${catalog}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', catalog] }),
  });
}

export function useTaxCategories(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['tax-categories', params],
    queryFn: () => api.get<Paginated<TaxCategoryDto>>(`/tax-categories?${qs({ size: 100, ...params })}`),
  });
}

export function useCreateTaxCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaxCategoryInput) => api.post<TaxCategoryDto>('/tax-categories', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-categories'] }),
  });
}

export function useUpdateTaxCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaxCategoryInput }) =>
      api.patch<TaxCategoryDto>(`/tax-categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-categories'] }),
  });
}

export function useDeleteTaxCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tax-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-categories'] }),
  });
}

export function useChargeTypes(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['charge-types', params],
    queryFn: () => api.get<Paginated<ChargeTypeDto>>(`/charge-types?${qs({ size: 100, ...params })}`),
  });
}

export function useCreateChargeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChargeTypeInput) => api.post<ChargeTypeDto>('/charge-types', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charge-types'] }),
  });
}

export function useUpdateChargeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChargeTypeInput }) =>
      api.patch<ChargeTypeDto>(`/charge-types/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charge-types'] }),
  });
}

export function useDeleteChargeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/charge-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charge-types'] }),
  });
}

export function useCharges(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['charges', params],
    queryFn: () => api.get<Paginated<ChargeDto>>(`/charges?${qs(params)}`),
  });
}

export function useCharge(id: string | null) {
  return useQuery({
    queryKey: ['charges', 'detail', id],
    queryFn: () => api.get<ChargeDetailDto>(`/charges/${id}`),
    enabled: !!id,
  });
}

export function useCreateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChargeInput) => api.post<ChargeDto>('/charges', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  });
}

export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChargeInput }) =>
      api.patch<ChargeDto>(`/charges/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  });
}

export function useDeleteCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/charges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  });
}

export function useUpdateChargeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeId, input }: { chargeId: string; input: ChargeScheduleUpdateInput }) =>
      api.put<ChargeScheduleEntryDto[]>(`/charges/${chargeId}/schedule`, input),
    onSuccess: (_data, { chargeId }) =>
      qc.invalidateQueries({ queryKey: ['charges', 'detail', chargeId] }),
  });
}
