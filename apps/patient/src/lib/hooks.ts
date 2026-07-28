'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentDto, InvoiceDto, PortalBookInput, PortalDoctorDto, PortalProfileDto, PortalVisitDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

export const useProfile = () => useQuery({ queryKey: ['me'], queryFn: () => api.get<PortalProfileDto>('/portal/me') });
export const useDoctors = () => useQuery({ queryKey: ['doctors'], queryFn: () => api.get<PortalDoctorDto[]>('/portal/doctors') });
export const useAppointments = () => useQuery({ queryKey: ['appointments'], queryFn: () => api.get<AppointmentDto[]>('/portal/appointments') });
export const useVisits = () => useQuery({ queryKey: ['visits'], queryFn: () => api.get<PortalVisitDto[]>('/portal/visits') });
export const useInvoices = () => useQuery({ queryKey: ['invoices'], queryFn: () => api.get<InvoiceDto[]>('/portal/invoices') });

export function useBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: PortalBookInput) => api.post<AppointmentDto>('/portal/appointments', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }) });
}
export function usePay() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, amount }: { id: string; amount: number }) => api.post<InvoiceDto>(`/portal/invoices/${id}/pay`, { amount }), onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }) });
}
