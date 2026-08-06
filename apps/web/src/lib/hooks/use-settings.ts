'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GeneralSettingInput,
  PrefixRowDto,
  PrefixUpdateInput,
  SettingsOverviewDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function useSettingsOverview() {
  return useQuery({
    queryKey: ['settings-overview'],
    queryFn: () => api.get<SettingsOverviewDto>('/settings'),
  });
}

export function useGeneralSetting() {
  return useQuery({
    queryKey: ['settings-general'],
    queryFn: () => api.get<GeneralSettingInput>('/settings/general'),
  });
}

export function useSaveGeneralSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GeneralSettingInput) => api.put<GeneralSettingInput>('/settings/general', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-general'] }),
  });
}

export function usePrefixes() {
  return useQuery({
    queryKey: ['settings-prefixes'],
    queryFn: () => api.get<PrefixRowDto[]>('/settings/prefixes'),
  });
}

export function useSavePrefixes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PrefixUpdateInput) => api.put<PrefixRowDto[]>('/settings/prefixes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-prefixes'] }),
  });
}
