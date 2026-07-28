'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddChargesInput,
  AddEncounterPaymentInput,
  EncounterBillingDto,
  EncounterType,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function useEncounterBilling(type: EncounterType, id: string) {
  return useQuery({
    queryKey: ['encounter-billing', type, id],
    queryFn: () => api.get<EncounterBillingDto>(`/encounter-billing/${type}/${id}`),
    enabled: !!id,
  });
}

export function useAddCharges(type: EncounterType, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddChargesInput) =>
      api.post<EncounterBillingDto>(`/encounter-billing/${type}/${id}/charges`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter-billing', type, id] }),
  });
}

export function useAddEncounterPayment(type: EncounterType, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddEncounterPaymentInput) =>
      api.post<EncounterBillingDto>(`/encounter-billing/${type}/${id}/payments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter-billing', type, id] }),
  });
}
