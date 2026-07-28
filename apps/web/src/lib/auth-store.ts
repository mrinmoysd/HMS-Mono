'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Ability, type AuthUser, type PermissionKey } from '@smart-hospital/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeBranchId: string | null;
  hasHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setActiveBranch: (branchId: string) => void;
  setHasHydrated: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeBranchId: null,
      hasHydrated: false,
      setSession: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, activeBranchId: user.branchId }),
      setActiveBranch: (branchId) => set({ activeBranchId: branchId }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      clear: () =>
        set({ user: null, accessToken: null, refreshToken: null, activeBranchId: null }),
    }),
    {
      name: 'sh-auth',
      storage: createJSONStorage(() => localStorage),
      // Don't persist the hydration flag.
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        activeBranchId: s.activeBranchId,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/** Build the client-side ability from the logged-in user's permissions. */
export function useAbility(): Ability {
  const user = useAuthStore((s) => s.user);
  return new Ability((user?.permissions ?? []) as PermissionKey[]);
}
