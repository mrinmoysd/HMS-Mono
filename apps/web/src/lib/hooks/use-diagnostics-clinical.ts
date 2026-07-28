'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddMedicationInput,
  CreatePrescriptionInput,
  LabInvestigationDto,
  MedicationDoseDto,
  OrderLabInput,
  PrescriptionDto,
  ReportLabInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export interface EncounterScope {
  patientId: string;
  encounterType?: 'opd' | 'ipd';
  encounterId?: string;
}

function qs(s: EncounterScope): string {
  const sp = new URLSearchParams({ patientId: s.patientId });
  if (s.encounterType) sp.set('encounterType', s.encounterType);
  if (s.encounterId) sp.set('encounterId', s.encounterId);
  return sp.toString();
}

const key = (name: string, s: EncounterScope) => [name, s.patientId, s.encounterType ?? '', s.encounterId ?? ''];

// ── Lab Investigation ────────────────────────────────────────
export function useLabInvestigations(s: EncounterScope) {
  return useQuery({
    queryKey: key('lab', s),
    queryFn: () => api.get<LabInvestigationDto[]>(`/clinical/lab?${qs(s)}`),
    enabled: !!s.patientId,
  });
}
export function useOrderLab(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderLabInput) => api.post<LabInvestigationDto>('/clinical/lab', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('lab', s) }),
  });
}
export function useReportLab(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReportLabInput }) =>
      api.patch<LabInvestigationDto>(`/clinical/lab/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('lab', s) }),
  });
}

// ── Prescription ─────────────────────────────────────────────
export function usePrescriptions(s: EncounterScope) {
  return useQuery({
    queryKey: key('prescriptions', s),
    queryFn: () => api.get<PrescriptionDto[]>(`/clinical/prescriptions?${qs(s)}`),
    enabled: !!s.patientId,
  });
}
export function useCreatePrescription(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePrescriptionInput) => api.post<PrescriptionDto>('/clinical/prescriptions', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('prescriptions', s) }),
  });
}

// ── Medication ───────────────────────────────────────────────
export function useMedication(s: EncounterScope) {
  return useQuery({
    queryKey: key('medication', s),
    queryFn: () => api.get<MedicationDoseDto[]>(`/clinical/medication?${qs(s)}`),
    enabled: !!s.patientId,
  });
}
export function useAddMedication(s: EncounterScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMedicationInput) => api.post<MedicationDoseDto>('/clinical/medication', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('medication', s) }),
  });
}
