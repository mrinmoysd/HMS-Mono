'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Channel,
  ChannelSettingDto,
  ChannelSettingInput,
  ChannelTestInput,
  ChannelTestResult,
  PaymentSettingDto,
  PaymentSettingInput,
  Paginated,
  UserAccountDto,
  UserListQuery,
  UserPasswordResetInput,
  UserStatusInput,
  GeneralSettingInput,
  NotificationEventDef,
  NotificationEventConfig,
  NotificationSettingInput,
  SystemNotificationEventDef,
  SystemNotificationEventConfig,
  SystemNotificationSettingInput,
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

interface NotificationsResponse {
  events: NotificationEventDef[];
  config: Record<string, NotificationEventConfig>;
}

interface SystemNotificationsResponse {
  events: SystemNotificationEventDef[];
  config: Record<string, SystemNotificationEventConfig>;
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

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['settings-notifications'],
    queryFn: () => api.get<NotificationsResponse>('/settings/notifications'),
  });
}

export function useSaveNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationSettingInput) =>
      api.put<NotificationsResponse>('/settings/notifications', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-notifications'] }),
  });
}

export function useChannelSetting(channel: Channel) {
  return useQuery({
    queryKey: ['settings-channel', channel],
    queryFn: () => api.get<ChannelSettingDto>(`/settings/channels/${channel}`),
  });
}

export function useSaveChannelSetting(channel: Channel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChannelSettingInput) =>
      api.put<ChannelSettingDto>(`/settings/channels/${channel}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-channel', channel] }),
  });
}

/**
 * Deliberately not a `useMutation` with cache invalidation: a test send changes
 * nothing, and re-fetching the settings after one would discard the admin's
 * unsaved edits.
 */
export function useTestChannel(channel: Channel) {
  return useMutation({
    mutationFn: (body: ChannelTestInput) =>
      api.post<ChannelTestResult>(`/settings/channels/${channel}/test`, body),
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['settings-payment-methods'],
    queryFn: () => api.get<PaymentSettingDto>('/settings/payment-methods'),
  });
}

export function useSavePaymentMethods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentSettingInput) =>
      api.put<PaymentSettingDto>('/settings/payment-methods', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-payment-methods'] }),
  });
}

export function useSettingsUsers(query: UserListQuery) {
  return useQuery({
    queryKey: ['settings-users', query],
    queryFn: () =>
      api.get<Paginated<UserAccountDto>>(
        `/settings/users?${new URLSearchParams({
          type: query.type,
          status: query.status,
          page: String(query.page),
          size: String(query.size),
          ...(query.search ? { search: query.search } : {}),
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UserStatusInput & { id: string }) =>
      api.patch<UserAccountDto>(`/settings/users/${id}/status`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, ...body }: UserPasswordResetInput & { id: string }) =>
      api.post<{ ok: true }>(`/settings/users/${id}/reset-password`, body),
  });
}

export function useSystemNotificationSettings() {
  return useQuery({
    queryKey: ['settings-system-notifications'],
    queryFn: () => api.get<SystemNotificationsResponse>('/settings/system-notifications'),
  });
}

export function useSaveSystemNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SystemNotificationSettingInput) =>
      api.put<SystemNotificationsResponse>('/settings/system-notifications', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-system-notifications'] }),
  });
}
