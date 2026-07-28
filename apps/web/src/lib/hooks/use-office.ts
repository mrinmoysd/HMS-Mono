'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BirthRecordDto, BirthRecordInput, BirthRecordUpdateInput, ContentShareDto, ContentShareInput,
  DeathRecordDto, DeathRecordInput, DeathRecordUpdateInput, InventoryItemDto, InventoryItemInput,
  ItemIssueInput, ItemMovementDto, ItemStockInput, ItemSupplierDto, ItemSupplierInput,
  ListQuery, LiveConsultationDto,
  LiveConsultationInput, NotificationDto, NotificationInput, Paginated, PhoneCallDto,
  PhoneCallInput, PostalComplaintDto, PostalComplaintInput, VisitorDto, VisitorInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}
function useList<T>(key: string, path: string, params: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: [key, params], queryFn: () => api.get<Paginated<T>>(`${path}?${qs(params)}`) });
}
function useCreator<TIn, TOut>(path: string, invalidate: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: TIn) => api.post<TOut>(path, input), onSuccess: () => qc.invalidateQueries({ queryKey: [invalidate] }) });
}

// Front office
export const useVisitors = (p: Partial<ListQuery>) => useList<VisitorDto>('visitors', '/front-office/visitors', p);
export const useCreateVisitor = () => useCreator<VisitorInput, VisitorDto>('/front-office/visitors', 'visitors');
export const usePhoneCalls = (p: Partial<ListQuery>) => useList<PhoneCallDto>('calls', '/front-office/calls', p);
export const useCreatePhoneCall = () => useCreator<PhoneCallInput, PhoneCallDto>('/front-office/calls', 'calls');
export const useComplaints = (p: Partial<ListQuery>) => useList<PostalComplaintDto>('complaints', '/front-office/complaints', p);
export const useCreateComplaint = () => useCreator<PostalComplaintInput, PostalComplaintDto>('/front-office/complaints', 'complaints');

// Records
export const useBirths = (p: Partial<ListQuery> = {}) => useList<BirthRecordDto>('births', '/records/births', p);
export const useCreateBirth = () => useCreator<BirthRecordInput, BirthRecordDto>('/records/births', 'births');
export function useBirth(id: string | null) {
  return useQuery({ queryKey: ['births', 'detail', id], queryFn: () => api.get<BirthRecordDto>(`/records/births/${id}`), enabled: !!id });
}
export function useUpdateBirth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BirthRecordUpdateInput }) => api.patch<BirthRecordDto>(`/records/births/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['births'] }),
  });
}
export function useDeleteBirth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/records/births/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['births'] }),
  });
}

export const useDeaths = (p: Partial<ListQuery> = {}) => useList<DeathRecordDto>('deaths', '/records/deaths', p);
export const useCreateDeath = () => useCreator<DeathRecordInput, DeathRecordDto>('/records/deaths', 'deaths');
export function useDeath(id: string | null) {
  return useQuery({ queryKey: ['deaths', 'detail', id], queryFn: () => api.get<DeathRecordDto>(`/records/deaths/${id}`), enabled: !!id });
}
export function useUpdateDeath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeathRecordUpdateInput }) => api.patch<DeathRecordDto>(`/records/deaths/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deaths'] }),
  });
}
export function useDeleteDeath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/records/deaths/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deaths'] }),
  });
}

// Messaging
export const useNotifications = (p: Partial<ListQuery>) => useList<NotificationDto>('notifications', '/notifications', p);
export const useCreateNotification = () => useCreator<NotificationInput, NotificationDto>('/notifications', 'notifications');

// Download center
export const useContent = (p: Partial<ListQuery>) => useList<ContentShareDto>('content', '/content', p);
export const useCreateContent = () => useCreator<ContentShareInput, ContentShareDto>('/content', 'content');

// Inventory
export const useInventoryItems = (p: Partial<ListQuery>) => useList<InventoryItemDto>('inv-items', '/inventory/items', p);
export const useCreateInventoryItem = () => useCreator<InventoryItemInput, InventoryItemDto>('/inventory/items', 'inv-items');
export const useItemIssues = (p: Partial<ListQuery>) => useList<ItemMovementDto>('inv-issues', '/inventory/issues', p);
export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ItemStockInput) => api.post('/inventory/stock', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-items'] }) });
}
export function useIssueItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ItemIssueInput) => api.post('/inventory/issues', i), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inv-items'] }); qc.invalidateQueries({ queryKey: ['inv-issues'] }); } });
}
export const useItemSuppliers = (p: Partial<ListQuery> = {}) => useList<ItemSupplierDto>('inv-suppliers', '/inventory/suppliers', p);
export const useCreateItemSupplier = () => useCreator<ItemSupplierInput, ItemSupplierDto>('/inventory/suppliers', 'inv-suppliers');
export function useUpdateItemSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ItemSupplierInput }) => api.patch<ItemSupplierDto>(`/inventory/suppliers/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-suppliers'] }),
  });
}
export function useDeleteItemSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/inventory/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-suppliers'] }),
  });
}

// Live consultation
export const useLive = (kind: string, p: Partial<ListQuery>) => useList<LiveConsultationDto>('live', '/live', { ...p, kind });
export const useCreateLive = () => useCreator<LiveConsultationInput, LiveConsultationDto>('/live', 'live');
