'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddConsultantRegisterInput,
  AddNurseNoteInput,
  BedHistoryRow,
  ConsultantRegisterDto,
  NurseNoteDto,
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

// ── Nurse Notes ──────────────────────────────────────────────
export function useNurseNotes(s: EncounterScope) {
  return useQuery({ queryKey: key('nurse-notes', s), queryFn: () => api.get<NurseNoteDto[]>(`/clinical/nurse-notes?${qs(s)}`), enabled: !!s.patientId });
}
export function useAddNurseNote(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddNurseNoteInput) => api.post<NurseNoteDto>('/clinical/nurse-notes', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('nurse-notes', s) }),
  });
}

// ── Consultant Register ──────────────────────────────────────
export function useConsultantRegister(s: EncounterScope) {
  return useQuery({ queryKey: key('consultant-register', s), queryFn: () => api.get<ConsultantRegisterDto[]>(`/clinical/consultant-register?${qs(s)}`), enabled: !!s.patientId });
}
export function useAddConsultantRegister(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddConsultantRegisterInput) => api.post<ConsultantRegisterDto>('/clinical/consultant-register', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('consultant-register', s) }),
  });
}

// ── Bed History / Transfer ───────────────────────────────────
export function useBedHistory(admissionId: string) {
  return useQuery({ queryKey: ['bed-history', admissionId], queryFn: () => api.get<BedHistoryRow[]>(`/ipd/${admissionId}/bed-history`), enabled: !!admissionId });
}
export function useTransferBed(admissionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bedId: string) => api.post<BedHistoryRow[]>(`/ipd/${admissionId}/bed-transfer`, { bedId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bed-history', admissionId] });
      qc.invalidateQueries({ queryKey: ['beds-available'] });
      qc.invalidateQueries({ queryKey: ['bed-status'] });
      qc.invalidateQueries({ queryKey: ['encounter-billing', 'ipd', admissionId] });
    },
  });
}
