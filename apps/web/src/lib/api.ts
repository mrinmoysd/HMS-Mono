'use client';

import type { ApiError, LoginResponse } from '@smart-hospital/shared';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const state = useAuthStore.getState();

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  if (auth && state.accessToken) finalHeaders.Authorization = `Bearer ${state.accessToken}`;
  if (state.activeBranchId) finalHeaders['x-branch-id'] = state.activeBranchId;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: ApiError }).error ?? {
      code: 'error',
      message: 'Request failed',
    };
    if (res.status === 401) useAuthStore.getState().clear();
    throw new ApiRequestError(res.status, err);
  }
  return json as T;
}

/**
 * Fetch a file the API only serves to an authenticated caller.
 *
 * A plain <a download> cannot carry the bearer token, so the bytes come back
 * through fetch and reach the disk via an object URL. Streamed by the browser
 * rather than parsed, so a database dump does not become a JavaScript string.
 */
async function download(path: string, filename: string): Promise<void> {
  const state = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  if (state.activeBranchId) headers['x-branch-id'] = state.activeBranchId;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: ApiError };
    if (res.status === 401) useAuthStore.getState().clear();
    throw new ApiRequestError(res.status, json.error ?? { code: 'error', message: 'Download failed' });
  }

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  download,
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

export function login(username: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', { username, password }, { auth: false });
}
