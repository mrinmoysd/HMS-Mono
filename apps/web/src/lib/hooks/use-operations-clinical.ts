'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLiveConsultInput,
  CreateOperationInput,
  EncounterLiveConsultDto,
  OperationRecordDto,
  UpdateLiveConsultStatusInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';
import type { EncounterScope } from './use-diagnostics-clinical';

function qs(s: EncounterScope): string {
  const sp = new URLSearchParams({ patientId: s.patientId });
  if (s.encounterType) sp.set('encounterType', s.encounterType);
  if (s.encounterId) sp.set('encounterId', s.encounterId);
  return sp.toString();
}
const key = (name: string, s: EncounterScope) => [name, s.patientId, s.encounterType ?? '', s.encounterId ?? ''];

// ── Operations ───────────────────────────────────────────────
export function useOperations(s: EncounterScope) {
  return useQuery({
    queryKey: key('operations', s),
    queryFn: () => api.get<OperationRecordDto[]>(`/clinical/operations?${qs(s)}`),
    enabled: !!s.patientId,
  });
}
export function useCreateOperation(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOperationInput) => api.post<OperationRecordDto>('/clinical/operations', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('operations', s) }),
  });
}

// ── Live Consultation ────────────────────────────────────────
export function useLiveConsults(s: EncounterScope) {
  return useQuery({
    queryKey: key('live-consults', s),
    queryFn: () => api.get<EncounterLiveConsultDto[]>(`/clinical/live-consults?${qs(s)}`),
    enabled: !!s.patientId,
  });
}
export function useCreateLiveConsult(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLiveConsultInput) => api.post<EncounterLiveConsultDto>('/clinical/live-consults', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('live-consults', s) }),
  });
}
export function useUpdateLiveConsultStatus(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLiveConsultStatusInput }) =>
      api.patch<EncounterLiveConsultDto>(`/clinical/live-consults/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('live-consults', s) }),
  });
}
