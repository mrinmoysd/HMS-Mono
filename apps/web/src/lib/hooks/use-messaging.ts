'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CredentialSendInput,
  EmailSendInput,
  ListQuery,
  NoticeDto,
  NoticeInput,
  Paginated,
  PatientCredentialDto,
  SmsSendInput,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Notice board ─────────────────────────────────────────────
export function useNotices(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['notices', params], queryFn: () => api.get<Paginated<NoticeDto>>(`/notifications?${qs({ size: 100, ...params })}`) });
}
export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: NoticeInput) => api.post<NoticeDto>('/notifications', i), onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }) });
}
export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NoticeInput }) => api.patch<NoticeDto>(`/notifications/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  });
}
export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/notifications/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }) });
}

// ── Send SMS / Email ─────────────────────────────────────────
export function useSendSms() {
  return useMutation({ mutationFn: (i: SmsSendInput) => api.post<{ ok: true }>('/messaging/sms', i) });
}
export function useSendEmail() {
  return useMutation({ mutationFn: (i: EmailSendInput) => api.post<{ ok: true }>('/messaging/email', i) });
}

// ── Patient credentials ──────────────────────────────────────
export function usePatientCredentials(params: Partial<ListQuery> = {}) {
  return useQuery({ queryKey: ['patient-credentials', params], queryFn: () => api.get<Paginated<PatientCredentialDto>>(`/messaging/patient-credentials?${qs({ size: 100, ...params })}`) });
}
export function useSendCredential() {
  return useMutation({ mutationFn: (i: CredentialSendInput) => api.post<{ ok: true; sent: number }>('/messaging/credential', i) });
}
