'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomFieldDto, CustomFieldInput } from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function useCustomFields(entity: string) {
  return useQuery({
    queryKey: ['custom-fields', entity],
    queryFn: () => api.get<CustomFieldDto[]>(`/custom-fields?entity=${entity}`),
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomFieldInput) => api.post<CustomFieldDto>('/custom-fields', input),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['custom-fields', v.entity] }),
  });
}

export function useDeleteCustomField(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/custom-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', entity] }),
  });
}
