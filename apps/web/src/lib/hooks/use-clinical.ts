'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentDto,
  AppointmentInput,
  InvoiceDto,
  IpdAdmissionDto,
  ListQuery,
  MoveToIpdInput,
  OpdCheckupDto,
  OpdCheckupInput,
  OpdVisitDetailDto,
  OpdPatientRow,
  OpdVisitDto,
  OpdVisitInput,
  OpdVisitUpdateInput,
  Paginated,
  PatientDto,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Doctors & patient search (for form selects) ──────────────
export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/directory/doctors'),
  });
}

export function usePatientSearch(search: string) {
  return useQuery({
    queryKey: ['patient-search', search],
    queryFn: () => api.get<Paginated<PatientDto>>(`/patients?${qs({ search, size: 10 })}`),
  });
}

/** Browsable patient directory for the OPD "Patient View" tab (wider page than the typeahead). */
/** OPD Patient View rollup — one row per patient, with Total Recheckup. */
export function useOpdPatientView(params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['opd-patient-view', params],
    queryFn: () => api.get<Paginated<OpdPatientRow>>(`/opd/patient-view?${qs(params)}`),
  });
}

export function usePatientDirectory(search: string) {
  return useQuery({
    queryKey: ['patient-directory', search],
    queryFn: () => api.get<Paginated<PatientDto>>(`/patients?${qs({ search, size: 50 })}`),
  });
}

// ── Appointments ─────────────────────────────────────────────
export function useAppointments(tab: string, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['appointments', tab, params],
    queryFn: () => api.get<Paginated<AppointmentDto>>(`/appointments?${qs({ tab, ...params })}`),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentInput) => api.post<AppointmentDto>('/appointments', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<AppointmentDto>(`/appointments/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

// ── OPD ──────────────────────────────────────────────────────
export function useOpdVisits(tab: string, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['opd', tab, params],
    queryFn: () => api.get<Paginated<OpdVisitDto>>(`/opd?${qs({ tab, ...params })}`),
  });
}

export function useCreateOpdVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpdVisitInput) => api.post<OpdVisitDto>('/opd', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opd'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
    },
  });
}

export function useOpdVisitDetail(id: string | null) {
  return useQuery({
    queryKey: ['opd-detail', id],
    queryFn: () => api.get<OpdVisitDetailDto>(`/opd/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOpdVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OpdVisitUpdateInput }) =>
      api.patch<OpdVisitDetailDto>(`/opd/${id}`, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['opd'] });
      qc.invalidateQueries({ queryKey: ['opd-detail', id] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
    },
  });
}

export function useDeleteOpdVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/opd/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opd'] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useMoveToIpd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveToIpdInput }) =>
      api.post<IpdAdmissionDto>(`/opd/${id}/move-to-ipd`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opd'] });
      qc.invalidateQueries({ queryKey: ['ipd'] });
      qc.invalidateQueries({ queryKey: ['patient-profile'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['beds-available'] });
    },
  });
}

// ── Billing / Invoices ───────────────────────────────────────
export function useInvoices(module: string | undefined, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['invoices', module, params],
    queryFn: () => api.get<Paginated<InvoiceDto>>(`/invoices?${qs({ module, ...params })}`),
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDto>(`/invoices/${id}`),
    enabled: !!id,
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, mode, reference }: { id: string; amount: number; mode: string; reference?: string }) =>
      api.post<InvoiceDto>(`/invoices/${id}/payments`, { amount, mode, reference }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', v.id] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentId }: { id: string; paymentId: string }) =>
      api.delete<InvoiceDto>(`/invoices/${id}/payments/${paymentId}`),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', v.id] });
    },
  });
}

// ── OPD checkups (CHKID) ─────────────────────────────────────
// A visit's consultations. Keyed by visit so adding one only refetches that
// visit's tab, not every OPD query on the page.
export function useOpdCheckups(visitId: string) {
  return useQuery({
    queryKey: ['opd-checkups', visitId],
    queryFn: () => api.get<OpdCheckupDto[]>(`/opd/${visitId}/checkups`),
    enabled: !!visitId,
  });
}

export function useCreateOpdCheckup(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpdCheckupInput) => api.post<OpdCheckupDto>(`/opd/${visitId}/checkups`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opd-checkups', visitId] }),
  });
}

export function useUpdateOpdCheckup(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OpdCheckupInput }) =>
      api.patch<OpdCheckupDto>(`/opd/checkups/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opd-checkups', visitId] }),
  });
}

export function useDeleteOpdCheckup(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/opd/checkups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opd-checkups', visitId] }),
  });
}
