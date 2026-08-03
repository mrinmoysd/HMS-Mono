'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentDetailDto,
  AppointmentDto,
  ConvertToOpdInput,
  DoctorWiseRow,
  OpdVisitDto,
  QueueRow,
  RescheduleAppointmentInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export function useAppointmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['appointment-detail', id],
    queryFn: () => api.get<AppointmentDetailDto>(`/appointments/${id}`),
    enabled: !!id,
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RescheduleAppointmentInput }) =>
      api.patch<AppointmentDto>(`/appointments/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

/**
 * Convert an appointment into an OPD visit (blueprint §9.1). One call: the
 * server creates the visit and marks the appointment consumed together, so a
 * dropped response cannot leave a booking that still looks convertible.
 */
export function useConvertToOpd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConvertToOpdInput }) =>
      api.post<OpdVisitDto>(`/appointments/${id}/convert-to-opd`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointment-queue'] });
      qc.invalidateQueries({ queryKey: ['opd'] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useDoctorWise(doctorId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['doctor-wise', doctorId, date],
    queryFn: () => api.get<DoctorWiseRow[]>(`/appointments/doctor-wise?doctorId=${doctorId}${date ? `&date=${date}` : ''}`),
    enabled: enabled && !!doctorId,
  });
}

export function useQueue(doctorId: string, shift: string, date: string, slot: string, enabled: boolean) {
  return useQuery({
    queryKey: ['appointment-queue', doctorId, shift, date, slot],
    queryFn: () => api.get<QueueRow[]>(`/appointments/queue?doctorId=${doctorId}&shift=${encodeURIComponent(shift)}&date=${date}${slot ? `&slot=${encodeURIComponent(slot)}` : ''}`),
    enabled: enabled && !!doctorId && !!shift && !!date,
  });
}

export function useReorderQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post<{ reordered: number }>('/appointments/queue/reorder', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-queue'] }),
  });
}
