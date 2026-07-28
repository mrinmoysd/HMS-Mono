'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DutyRosterRowDto,
  ListQuery,
  Paginated,
  RosterAssignmentDto,
  RosterAssignmentInput,
  RosterPeriodDto,
  RosterPeriodInput,
  DutyShiftDto,
  ShiftInput,
  ShiftUpdateInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Shifts ───────────────────────────────────────────────────
export function useDrShifts() {
  return useQuery({ queryKey: ['dr-shifts'], queryFn: () => api.get<DutyShiftDto[]>('/duty-roster/shifts') });
}
export function useCreateDrShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ShiftInput) => api.post<DutyShiftDto>('/duty-roster/shifts', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-shifts'] }) });
}
export function useUpdateDrShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShiftUpdateInput }) => api.patch<DutyShiftDto>(`/duty-roster/shifts/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-shifts'] }),
  });
}
export function useDeleteDrShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/duty-roster/shifts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-shifts'] }) });
}

// ── Roster periods ───────────────────────────────────────────
export function useRosterPeriods(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['dr-rosters', params], queryFn: () => api.get<Paginated<RosterPeriodDto>>(`/duty-roster/rosters?${qs({ size: 100, ...params })}`) });
}
export function useAllRosterPeriods() {
  return useQuery({ queryKey: ['dr-rosters-all'], queryFn: () => api.get<RosterPeriodDto[]>('/duty-roster/rosters/all') });
}
export function useCreateRosterPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: RosterPeriodInput) => api.post<RosterPeriodDto>('/duty-roster/rosters', i),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dr-rosters'] }); qc.invalidateQueries({ queryKey: ['dr-rosters-all'] }); },
  });
}
export function useDeleteRosterPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/duty-roster/rosters/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dr-rosters'] }); qc.invalidateQueries({ queryKey: ['dr-rosters-all'] }); qc.invalidateQueries({ queryKey: ['dr-assignments'] }); },
  });
}

// ── Assignments ──────────────────────────────────────────────
export function useRosterAssignments(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['dr-assignments', params], queryFn: () => api.get<Paginated<RosterAssignmentDto>>(`/duty-roster/assignments?${qs({ size: 100, ...params })}`) });
}
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: RosterAssignmentInput) => api.post<RosterAssignmentDto>('/duty-roster/assignments', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-assignments'] }) });
}
export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RosterAssignmentInput }) => api.patch<RosterAssignmentDto>(`/duty-roster/assignments/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-assignments'] }),
  });
}
export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/duty-roster/assignments/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['dr-assignments'] }) });
}

// ── Main daily list ──────────────────────────────────────────
export function useDutyRosterDaily(rosterId: string | undefined, staffUserId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['dr-daily', rosterId, staffUserId],
    queryFn: () => api.get<DutyRosterRowDto[]>(`/duty-roster?${qs({ rosterId, staffUserId })}`),
    enabled: enabled && !!rosterId,
  });
}
