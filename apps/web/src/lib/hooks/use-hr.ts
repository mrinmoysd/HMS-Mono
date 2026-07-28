'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttendanceDto,
  HolidayDto,
  HolidayInput,
  LeaveRequestDto,
  LeaveRequestInput,
  LeaveStatusInput,
  LeaveTypeDto,
  LeaveTypeInput,
  ListQuery,
  MarkAttendanceInput,
  Paginated,
  PayrollDto,
  PayrollInput,
  RosterDto,
  RosterInput,
  SaveAttendanceInput,
  ShiftInput,
  StaffDetailDto,
  StaffDto,
  StaffInput,
  StaffUpdateInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Staff ────────────────────────────────────────────────────
export function useStaff(role: string | undefined, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['staff', role, params],
    queryFn: () => api.get<Paginated<StaffDto>>(`/hr/staff?${qs({ role, ...params })}`),
  });
}
export function useStaffProfile(userId: string | null) {
  return useQuery({
    queryKey: ['staff', 'detail', userId],
    queryFn: () => api.get<StaffDetailDto>(`/hr/staff/${userId}`),
    enabled: !!userId,
  });
}
export function useStaffRoles() {
  return useQuery({ queryKey: ['staff-roles'], queryFn: () => api.get<{ slug: string; label: string }[]>('/hr/staff/roles') });
}
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffInput) => api.post<StaffDetailDto>('/hr/staff', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: StaffUpdateInput }) => api.patch<StaffDetailDto>(`/hr/staff/${userId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/hr/staff/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
export function useChangeStaffPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => api.post<void>(`/hr/staff/${userId}/change-password`, { password }),
  });
}

// ── Attendance ───────────────────────────────────────────────
/** Every-staff attendance rows for a date (returns an array, not paginated). */
export function useAttendanceGrid(date: string, role: string | undefined) {
  return useQuery({
    queryKey: ['attendance', date, role],
    queryFn: () => api.get<AttendanceDto[]>(`/hr/attendance?${qs({ date, role })}`),
  });
}
export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAttendanceInput) => api.post<{ saved: number }>('/hr/attendance/save', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => api.post<AttendanceDto>('/hr/attendance/mark', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

// ── Shifts & roster ──────────────────────────────────────────
export function useShifts() {
  return useQuery({ queryKey: ['shifts'], queryFn: () => api.get<{ id: string; name: string }[]>('/hr/shifts') });
}
export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ShiftInput) => api.post('/hr/shifts', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}
export function useRoster(params: Partial<ListQuery>) {
  return useQuery({ queryKey: ['roster', params], queryFn: () => api.get<Paginated<RosterDto>>(`/hr/roster?${qs({ ...params, size: 100 })}`) });
}
export function useAssignRoster() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: RosterInput) => api.post<RosterDto>('/hr/roster', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }) });
}

// ── Payroll ──────────────────────────────────────────────────
export function usePayrollList(role: string | undefined, month: string) {
  return useQuery({ queryKey: ['payroll', role, month], queryFn: () => api.get<PayrollDto[]>(`/hr/payroll?${qs({ role, month })}`) });
}
export function usePayslip(userId: string | null, month: string) {
  return useQuery({ queryKey: ['payroll', 'slip', userId, month], queryFn: () => api.get<PayrollDto>(`/hr/payroll/${userId}?${qs({ month })}`), enabled: !!userId });
}
export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: PayrollInput) => api.post<PayrollDto>('/hr/payroll', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }) });
}

// ── Leaves ───────────────────────────────────────────────────
export function useLeaveTypes() {
  return useQuery({ queryKey: ['leave-types'], queryFn: () => api.get<LeaveTypeDto[]>('/hr/leave-types') });
}
export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: LeaveTypeInput) => api.post('/hr/leave-types', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }) });
}
export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeaveTypeInput }) => api.patch<LeaveTypeDto>(`/hr/leave-types/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}
export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/hr/leave-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}
export function useLeaves(params: Partial<ListQuery>) {
  return useQuery({ queryKey: ['leaves', params], queryFn: () => api.get<Paginated<LeaveRequestDto>>(`/hr/leaves?${qs(params)}`) });
}
export function useLeave(id: string | null) {
  return useQuery({ queryKey: ['leaves', 'detail', id], queryFn: () => api.get<LeaveRequestDto>(`/hr/leaves/${id}`), enabled: !!id });
}
export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: LeaveRequestInput) => api.post<LeaveRequestDto>('/hr/leaves', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });
}
export function useSetLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeaveStatusInput }) => api.patch<LeaveRequestDto>(`/hr/leaves/${id}/status`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/hr/leaves/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });
}

// ── Annual Calendar ──────────────────────────────────────────
export function useHolidays(type: string | undefined, params: Partial<ListQuery>) {
  return useQuery({ queryKey: ['holidays', type, params], queryFn: () => api.get<Paginated<HolidayDto>>(`/calendar/holidays?${qs({ type, ...params })}`) });
}
export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: HolidayInput) => api.post<HolidayDto>('/calendar/holidays', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }) });
}
