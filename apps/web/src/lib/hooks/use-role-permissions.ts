'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthUser,
  EditableRoleDto,
  PermissionChangeInput,
  RolePermissionsDto,
  RolePermissionsUpdateResultDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function useEditableRoles() {
  return useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get<EditableRoleDto[]>('/rbac/roles'),
  });
}

export function useRolePermissions(slug: string | undefined) {
  return useQuery({
    queryKey: ['rbac-role-permissions', slug],
    queryFn: () => api.get<RolePermissionsDto>(`/rbac/roles/${slug}/permissions`),
    enabled: !!slug,
  });
}

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, changes }: { slug: string; changes: PermissionChangeInput[] }) =>
      api.put<RolePermissionsUpdateResultDto>(`/rbac/roles/${slug}/permissions`, { changes }),
    onSuccess: async (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['rbac-role-permissions', vars.slug] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });

      // Editing your OWN role changes what you may do, immediately: the API
      // reloads permissions from the database on every request, so the very
      // next call is judged by the new grants. The persisted auth store would
      // still hold the old ones, and the UI reads its sidebar and every
      // enable/disable from there — so the screen would keep offering actions
      // the API has already started refusing. Re-fetch the session instead.
      const state = useAuthStore.getState();
      if (state.user?.roleSlug === vars.slug) {
        const fresh = await api.get<AuthUser>('/auth/me');
        if (state.accessToken && state.refreshToken) {
          state.setSession(fresh, state.accessToken, state.refreshToken);
        }
      }
    },
  });
}
