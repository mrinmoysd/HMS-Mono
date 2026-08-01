'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddFindingRecordInput,
  AddSymptomRecordInput,
  AddVitalsInput,
  FindingDto,
  FindingInput,
  PatientProfileDto,
  PatientReportDto,
  SymptomTypeDto,
  SymptomTypeInput,
  IcdCodeDto,
  IcdCodeInput,
  TimelineEntryDto,
  TimelineEntryInput,
  UpdateTimelineInput,
  UpdateVitalInput,
  VitalMatrixDto,
  VitalTypeDto,
  VitalTypeInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function usePatientProfile(patientId: string) {
  return useQuery({
    queryKey: ['patient-profile', patientId],
    queryFn: () => api.get<PatientProfileDto>(`/patients/${patientId}/profile`),
    enabled: !!patientId,
  });
}

export function usePatientReport(patientId: string, enabled = true) {
  return useQuery({
    queryKey: ['patient-report', patientId],
    queryFn: () => api.get<PatientReportDto>(`/patients/${patientId}/report`),
    enabled: enabled && !!patientId,
  });
}

export function useVitalTypes() {
  return useQuery({ queryKey: ['vital-types'], queryFn: () => api.get<VitalTypeDto[]>('/vital-types') });
}

// ── Setup masters: Vital Types / Findings / Symptom Types ──────
export function useCreateVitalType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VitalTypeInput) => api.post<VitalTypeDto>('/vital-types', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vital-types'] }),
  });
}

export function useFindingMasters() {
  return useQuery({ queryKey: ['finding-masters'], queryFn: () => api.get<FindingDto[]>('/findings') });
}
export function useCreateFindingMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FindingInput) => api.post<FindingDto>('/findings', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finding-masters'] }),
  });
}

export function useSymptomTypeMasters() {
  return useQuery({ queryKey: ['symptom-type-masters'], queryFn: () => api.get<SymptomTypeDto[]>('/symptom-types') });
}
export function useCreateSymptomTypeMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SymptomTypeInput) => api.post<SymptomTypeDto>('/symptom-types', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['symptom-type-masters'] }),
  });
}

/** ICD-10 codes (Setup ▸ Clinical ▸ ICD Code, and the diagnosis cascade). */
export function useIcdCodes() {
  return useQuery({ queryKey: ['icd-codes'], queryFn: () => api.get<IcdCodeDto[]>('/icd-codes') });
}
export function useCreateIcdCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IcdCodeInput) => api.post<IcdCodeDto>('/icd-codes', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icd-codes'] }),
  });
}
export function useUpdateIcdCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IcdCodeInput }) =>
      api.patch<IcdCodeDto>(`/icd-codes/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icd-codes'] }),
  });
}
export function useDeleteIcdCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/icd-codes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icd-codes'] }),
  });
}

export function useVitalMatrix(patientId: string) {
  return useQuery({
    queryKey: ['vital-matrix', patientId],
    queryFn: () => api.get<VitalMatrixDto>(`/clinical/vitals/matrix?patientId=${patientId}`),
    enabled: !!patientId,
  });
}

function invalidatePatient(qc: ReturnType<typeof useQueryClient>, patientId: string) {
  qc.invalidateQueries({ queryKey: ['patient-profile', patientId] });
  qc.invalidateQueries({ queryKey: ['vital-matrix', patientId] });
}

export function useAddVitals(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddVitalsInput) => api.post('/clinical/vitals', input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useUpdateVital(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVitalInput }) =>
      api.patch<void>(`/clinical/vitals/${id}`, input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useDeleteVital(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/clinical/vitals/${id}`),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useAddFinding(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddFindingRecordInput) => api.post('/clinical/findings', input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useAddSymptom(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSymptomRecordInput) => api.post('/clinical/symptoms', input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useAddTimeline(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TimelineEntryInput) => api.post<TimelineEntryDto>('/clinical/timeline', input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useUpdateTimeline(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTimelineInput }) =>
      api.patch<TimelineEntryDto>(`/clinical/timeline/${id}`, input),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
export function useDeleteTimeline(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/clinical/timeline/${id}`),
    onSuccess: () => invalidatePatient(qc, patientId),
  });
}
