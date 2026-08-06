'use client';

import { useQuery } from '@tanstack/react-query';
import { GENERAL_SETTING_DEFAULT, type GeneralSettingInput } from '@smart-hospital/shared';
import { api } from '@/lib/api';
import { setHospitalSettings } from '@/lib/hospital-settings';

/**
 * Loads the branch's General Setting into the synchronous snapshot that
 * `lib/format.ts` and `lib/print.ts` read from, and holds first render until it
 * is there.
 *
 * Blocking matters: if children rendered first, every date and amount in the
 * product would paint with the schema defaults and then reflow into the real
 * format a moment later. On a list of fifty rows that reads as a bug, not a
 * load.
 *
 * The write happens during render rather than in an effect, because an effect
 * runs *after* children have already rendered — which is exactly the flash this
 * exists to prevent. Assigning to a module-level snapshot is idempotent and
 * touches no React state, so it is safe here.
 */
export function HospitalSettingsGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings-general-runtime'],
    queryFn: () => api.get<GeneralSettingInput>('/settings/general'),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (data) setHospitalSettings(data);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  // A settings fetch that fails must not lock the user out of the hospital.
  // Every field has a schema default, so the app stays usable with those and
  // the next successful fetch corrects it.
  if (isError) setHospitalSettings(GENERAL_SETTING_DEFAULT);

  return <>{children}</>;
}
