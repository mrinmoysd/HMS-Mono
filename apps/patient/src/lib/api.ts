'use client';

import type { ApiError, LoginResponse, PortalRegisterInput } from '@smart-hospital/shared';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly error: ApiError) {
    super(error.message);
  }
}

interface Opts extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;
  const state = useAuthStore.getState();
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers as Record<string, string>) };
  if (auth && state.accessToken) h.Authorization = `Bearer ${state.accessToken}`;
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: ApiError }).error ?? { code: 'error', message: 'Request failed' };
    if (res.status === 401) useAuthStore.getState().clear();
    throw new ApiRequestError(res.status, err);
  }
  return json as T;
}

export const api = {
  get: <T>(p: string, o?: Opts) => request<T>(p, { ...o, method: 'GET' }),
  post: <T>(p: string, body?: unknown, o?: Opts) => request<T>(p, { ...o, method: 'POST', body }),
};

export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { username, password }, { auth: false });

export const register = (input: PortalRegisterInput) =>
  api.post<LoginResponse>('/portal/register', input, { auth: false });
