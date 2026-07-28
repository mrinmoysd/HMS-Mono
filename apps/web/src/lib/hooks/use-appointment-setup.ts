'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentPriorityDto,
  AppointmentPriorityInput,
  DoctorFeeDto,
  DoctorShiftMatrixDto,
  ShiftDto,
  ShiftInput,
  SlotConfigDto,
  SlotConfigInput,
  SlotDto,
  ToggleDoctorShiftInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

// ── Shifts ───────────────────────────────────────────────────
export function useShifts() {
  return useQuery({ queryKey: ['shifts'], queryFn: () => api.get<ShiftDto[]>('/shifts') });
}
export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: ShiftInput) => api.post<ShiftDto>('/shifts', input), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}
export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: ShiftInput }) => api.patch<ShiftDto>(`/shifts/${id}`, input), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}
export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/shifts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}

// ── Appointment priorities ───────────────────────────────────
export function usePriorities() {
  return useQuery({ queryKey: ['appointment-priorities'], queryFn: () => api.get<AppointmentPriorityDto[]>('/appointment-priorities') });
}
export function useCreatePriority() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: AppointmentPriorityInput) => api.post<AppointmentPriorityDto>('/appointment-priorities', input), onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-priorities'] }) });
}
export function useUpdatePriority() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: AppointmentPriorityInput }) => api.patch<AppointmentPriorityDto>(`/appointment-priorities/${id}`, input), onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-priorities'] }) });
}
export function useDeletePriority() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/appointment-priorities/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-priorities'] }) });
}

// ── Doctor Shift matrix ──────────────────────────────────────
export function useDoctorShiftMatrix() {
  return useQuery({ queryKey: ['doctor-shifts'], queryFn: () => api.get<DoctorShiftMatrixDto>('/doctor-shifts') });
}
export function useToggleDoctorShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ToggleDoctorShiftInput) => api.post<{ active: boolean }>('/doctor-shifts/toggle', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-shifts'] }),
  });
}

// ── Slot config ──────────────────────────────────────────────
export function useSlotConfig(doctorId: string, shiftId: string) {
  return useQuery({
    queryKey: ['slot-config', doctorId, shiftId],
    queryFn: () => api.get<SlotConfigDto>(`/doctor-shifts/slot-config?doctorId=${doctorId}&shiftId=${shiftId}`),
    enabled: !!doctorId && !!shiftId,
  });
}
export function useSaveSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SlotConfigInput) => api.post<SlotConfigDto>('/doctor-shifts/slot-config', input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['slot-config', v.doctorId, v.shiftId] });
      qc.invalidateQueries({ queryKey: ['doctor-shifts'] });
    },
  });
}

// ── Slots + fee lookup (used by the appointment form in A1) ──
export function useAvailableSlots(doctorId: string, shiftId: string, date: string) {
  return useQuery({
    queryKey: ['appt-slots', doctorId, shiftId, date],
    queryFn: () => api.get<SlotDto[]>(`/appointments/slots?doctorId=${doctorId}&shiftId=${shiftId}&date=${date}`),
    enabled: !!doctorId && !!shiftId && !!date,
  });
}

export function useDoctorFee(doctorId: string, shiftId: string) {
  return useQuery({
    queryKey: ['doctor-fee', doctorId, shiftId],
    queryFn: () => api.get<DoctorFeeDto>(`/appointments/doctor-fee?doctorId=${doctorId}&shiftId=${shiftId}`),
    enabled: !!doctorId && !!shiftId,
  });
}
