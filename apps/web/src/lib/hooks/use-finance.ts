'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AmbulanceCallDto,
  AmbulanceCallInput,
  AmbulanceVehicleDto,
  AmbulanceVehicleInput,
  FinanceSummary,
  LedgerEntryDto,
  LedgerEntryInput,
  ListQuery,
  Paginated,
  ReferralPatientDetailDto,
  ReferralPaymentDto,
  ReferralPaymentInput,
  ReferralPersonDto,
  ReferralPersonInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Finance ──────────────────────────────────────────────────
export function useFinanceSummary() {
  return useQuery({ queryKey: ['finance-summary'], queryFn: () => api.get<FinanceSummary>('/finance/summary') });
}
export function useLedger(kind: 'income' | 'expense', params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['ledger', kind, params],
    queryFn: () => api.get<Paginated<LedgerEntryDto>>(`/finance/${kind}?${qs(params)}`),
  });
}
export function useCreateLedger(kind: 'income' | 'expense') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LedgerEntryInput) => api.post<LedgerEntryDto>(`/finance/${kind}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger', kind] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}
export function useUpdateLedger(kind: 'income' | 'expense') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LedgerEntryInput }) => api.patch<LedgerEntryDto>(`/finance/${kind}/${id}`, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ledger', kind] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); },
  });
}
export function useDeleteLedger(kind: 'income' | 'expense') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/${kind}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ledger', kind] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); },
  });
}

// ── Referral ─────────────────────────────────────────────────
export function useReferralPersons(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['referral-persons', params],
    queryFn: () => api.get<Paginated<ReferralPersonDto>>(`/referral/persons?${qs({ size: 100, ...params })}`),
  });
}
export function useReferralPayments(params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['referral-payments', params],
    queryFn: () => api.get<Paginated<ReferralPaymentDto>>(`/referral/payments?${qs(params)}`),
  });
}
export function useReferralPatient(patientId: string | null) {
  return useQuery({
    queryKey: ['referral-patient', patientId],
    queryFn: () => api.get<ReferralPatientDetailDto>(`/referral/patients/${patientId}`),
    enabled: !!patientId,
  });
}
export function useCreateReferralPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReferralPersonInput) => api.post<ReferralPersonDto>('/referral/persons', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-persons'] }),
  });
}
export function useUpdateReferralPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReferralPersonInput }) => api.patch<ReferralPersonDto>(`/referral/persons/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-persons'] }),
  });
}
export function useDeleteReferralPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/referral/persons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-persons'] }),
  });
}
export function useCreateReferralPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReferralPaymentInput) => api.post<ReferralPaymentDto>('/referral/payments', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-payments'] }),
  });
}
export function useUpdateReferralPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReferralPaymentInput }) => api.patch<ReferralPaymentDto>(`/referral/payments/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-payments'] }),
  });
}
export function useDeleteReferralPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/referral/payments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-payments'] }),
  });
}

// ── Ambulance ────────────────────────────────────────────────
export function useAmbulanceVehicles(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['ambulance-vehicles', params],
    queryFn: () => api.get<Paginated<AmbulanceVehicleDto>>(`/ambulance/vehicles?${qs({ size: 100, ...params })}`),
  });
}
export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AmbulanceVehicleInput) => api.post<AmbulanceVehicleDto>('/ambulance/vehicles', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ambulance-vehicles'] }),
  });
}
export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AmbulanceVehicleInput }) =>
      api.patch<AmbulanceVehicleDto>(`/ambulance/vehicles/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ambulance-vehicles'] }),
  });
}
export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/ambulance/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ambulance-vehicles'] }),
  });
}

export function useAmbulanceCalls(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['ambulance-calls', params],
    queryFn: () => api.get<Paginated<AmbulanceCallDto>>(`/ambulance/calls?${qs(params)}`),
  });
}
export function useAmbulanceCall(id: string | null) {
  return useQuery({
    queryKey: ['ambulance-calls', 'detail', id],
    queryFn: () => api.get<AmbulanceCallDto>(`/ambulance/calls/${id}`),
    enabled: !!id,
  });
}
export function useCreateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AmbulanceCallInput) => api.post<AmbulanceCallDto>('/ambulance/calls', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ambulance-calls'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
