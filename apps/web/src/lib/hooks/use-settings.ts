'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GeneralSettingInput,
  ModuleSettingInput,
  ModuleStateDto,
  ModuleToggleRow,
  PrefixRowDto,
  PrefixUpdateInput,
  SettingsOverviewDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

interface ModulesResponse {
  rows: ModuleToggleRow[];
  disabled: string[];
}

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

export function useModules() {
  return useQuery({
    queryKey: ['settings-modules'],
    queryFn: () => api.get<ModulesResponse>('/settings/modules'),
  });
}

export function useSaveModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ModuleSettingInput) => api.put<ModulesResponse>('/settings/modules', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-modules'] });
      // The sidebar reads a different key; without this it keeps showing links
      // to modules that were just switched off until the next full reload.
      qc.invalidateQueries({ queryKey: ['module-state'] });
    },
  });
}

/**
 * The disabled module list, for the sidebar. Every signed-in user needs it, so
 * this is the `@Authenticated` endpoint rather than the Settings one.
 */
export function useModuleState() {
  return useQuery({
    queryKey: ['module-state'],
    queryFn: () => api.get<ModuleStateDto>('/settings/modules/state'),
    // Rarely changes and is on the critical path for rendering navigation.
    staleTime: 60_000,
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
