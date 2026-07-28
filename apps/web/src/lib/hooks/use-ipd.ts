'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BedDto,
  BedGroupDto,
  BedGroupInput,
  BedInput,
  BedStatusSummary,
  IpdAdmissionDetailDto,
  IpdAdmissionDto,
  IpdAdmissionInput,
  IpdAdmissionUpdateInput,
  IpdTreatmentHistoryRow,
  ListQuery,
  Paginated,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Beds ─────────────────────────────────────────────────────
export function useBedStatus(enabled = true) {
  return useQuery({
    queryKey: ['bed-status'],
    queryFn: () => api.get<BedStatusSummary>('/beds/status'),
    enabled,
  });
}

export function useAvailableBeds(bedGroupId?: string) {
  return useQuery({
    queryKey: ['beds-available', bedGroupId],
    queryFn: () => api.get<BedDto[]>(`/beds/available?${qs({ bedGroupId })}`),
  });
}

export function useBedGroups() {
  return useQuery({
    queryKey: ['bed-groups'],
    queryFn: () => api.get<Paginated<BedGroupDto>>('/bed-groups?size=100'),
  });
}

export function useCreateBedGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BedGroupInput) => api.post<BedGroupDto>('/bed-groups', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bed-groups'] }),
  });
}

export function useUpdateBedGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BedGroupInput }) =>
      api.patch<BedGroupDto>(`/bed-groups/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bed-groups'] }),
  });
}

export function useDeleteBedGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/bed-groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bed-groups'] }),
  });
}

export function useBeds() {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get<Paginated<BedDto>>('/beds?size=200'),
  });
}

export function useCreateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BedInput) => api.post<BedDto>('/beds', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
    },
  });
}

export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BedInput }) => api.patch<BedDto>(`/beds/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
    },
  });
}

export function useDeleteBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/beds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
    },
  });
}

// ── IPD ──────────────────────────────────────────────────────
export function useIpdAdmissions(tab: string, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['ipd', tab, params],
    queryFn: () => api.get<Paginated<IpdAdmissionDto>>(`/ipd?${qs({ tab, ...params })}`),
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IpdAdmissionInput) => api.post<IpdAdmissionDto>('/ipd', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipd'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
      qc.invalidateQueries({ queryKey: ['beds-available'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<IpdAdmissionDto>(`/ipd/${id}/discharge`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipd'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
      qc.invalidateQueries({ queryKey: ['beds-available'] });
    },
  });
}

export function useIpdAdmissionDetail(id: string | null) {
  return useQuery({
    queryKey: ['ipd-detail', id],
    queryFn: () => api.get<IpdAdmissionDetailDto>(`/ipd/${id}`),
    enabled: !!id,
  });
}

export function useUpdateIpdAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IpdAdmissionUpdateInput }) =>
      api.patch<IpdAdmissionDetailDto>(`/ipd/${id}`, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['ipd'] });
      qc.invalidateQueries({ queryKey: ['ipd-detail', id] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
    },
  });
}

export function useDeleteIpdAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/ipd/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipd'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
      qc.invalidateQueries({ queryKey: ['beds-available'] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
    },
  });
}

export function useIpdAdmissionsByPatient(patientId: string) {
  return useQuery({
    queryKey: ['ipd-by-patient', patientId],
    queryFn: () => api.get<IpdTreatmentHistoryRow[]>(`/ipd/by-patient/${patientId}`),
    enabled: !!patientId,
  });
}
