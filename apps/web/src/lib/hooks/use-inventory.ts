'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InventoryItemDto,
  InventoryItemInput,
  ItemIssueDto,
  ItemIssueInput,
  ItemStockDto,
  ItemStockInput,
  ItemSupplierDto,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Items ────────────────────────────────────────────────────
export function useItems(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['inv-items', params], queryFn: () => api.get<Paginated<InventoryItemDto>>(`/inventory/items?${qs({ size: 100, ...params })}`) });
}
export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: InventoryItemInput) => api.post<InventoryItemDto>('/inventory/items', i), onSuccess: () => inval(qc) });
}
export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: InventoryItemInput }) => api.patch<InventoryItemDto>(`/inventory/items/${id}`, input), onSuccess: () => inval(qc) });
}
export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/inventory/items/${id}`), onSuccess: () => inval(qc) });
}

// ── Stock ────────────────────────────────────────────────────
export function useStockList(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['inv-stock', params], queryFn: () => api.get<Paginated<ItemStockDto>>(`/inventory/stock?${qs({ size: 100, ...params })}`) });
}
export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ItemStockInput) => api.post('/inventory/stock', i), onSuccess: () => inval(qc) });
}
export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: ItemStockInput }) => api.patch(`/inventory/stock/${id}`, input), onSuccess: () => inval(qc) });
}
export function useDeleteStock() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/inventory/stock/${id}`), onSuccess: () => inval(qc) });
}

// ── Issues ───────────────────────────────────────────────────
export function useIssueList(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['inv-issues', params], queryFn: () => api.get<Paginated<ItemIssueDto>>(`/inventory/issues?${qs({ size: 100, ...params })}`) });
}
export function useIssueItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ItemIssueInput) => api.post('/inventory/issues', i), onSuccess: () => inval(qc) });
}
export function useReturnItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/inventory/issues/${id}/return`), onSuccess: () => inval(qc) });
}
export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/inventory/issues/${id}`), onSuccess: () => inval(qc) });
}

// ── Suppliers (read-only select) ─────────────────────────────
export function useSuppliers(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['inv-suppliers', params], queryFn: () => api.get<Paginated<ItemSupplierDto>>(`/inventory/suppliers?${qs({ size: 100, ...params })}`) });
}

function inval(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inv-items'] });
  qc.invalidateQueries({ queryKey: ['inv-stock'] });
  qc.invalidateQueries({ queryKey: ['inv-issues'] });
}
