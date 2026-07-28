'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  canonicalizePhone,
  PHONE_LOOKUP_MIN_DIGITS,
  type Paginated,
  type PatientDto,
  type PatientImportInput,
  type PatientImportResult,
  type PatientInput,
  type PatientListQuery,
  type UpdatePatientInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(params: Partial<PatientListQuery>): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.sort) sp.set('sort', params.sort);
  if (params.disabled) sp.set('disabled', params.disabled);
  return sp.toString();
}

export function usePatients(params: Partial<PatientListQuery>) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => api.get<Paginated<PatientDto>>(`/patients?${qs(params)}`),
  });
}

/**
 * Every patient already registered under a phone number — the shared-number
 * checkpoint on create. Only runs once the canonical (digits-only) form is long
 * enough, so blank/short input never fires a request.
 */
export function usePatientPhoneLookup(phone: string) {
  const normalized = canonicalizePhone(phone);
  const enabled = !!normalized && normalized.length >= PHONE_LOOKUP_MIN_DIGITS;
  return useQuery({
    queryKey: ['patients', 'lookup', normalized],
    queryFn: () => api.get<PatientDto[]>(`/patients/lookup?phone=${encodeURIComponent(phone)}`),
    enabled,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) => api.post<PatientDto>('/patients', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePatientInput }) =>
      api.patch<PatientDto>(`/patients/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useImportPatients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientImportInput) =>
      api.post<PatientImportResult>('/patients/import', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useBulkDeletePatients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.delete<{ deleted: number }>('/patients/bulk', { body: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
