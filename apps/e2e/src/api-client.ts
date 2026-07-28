import { request, type APIRequestContext } from '@playwright/test';
import { API_URL, PASSWORD, type Role } from './config';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  type: string;
  roleSlug: string;
  roleLabel: string;
  branchId: string;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
}

/** Raw login against the API — no browser involved. */
export async function apiLogin(username: string, password = PASSWORD): Promise<LoginResponse> {
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.post('/auth/login', { data: { username, password } });
    if (!res.ok()) {
      throw new Error(`Login failed for "${username}": ${res.status()} ${await res.text()}`);
    }
    return (await res.json()) as LoginResponse;
  } finally {
    await ctx.dispose();
  }
}

/**
 * An authenticated API context for a seeded role. Sends both the bearer token
 * and the `x-branch-id` header the BranchContextInterceptor expects.
 */
export async function apiContextFor(role: Role): Promise<{
  ctx: APIRequestContext;
  session: LoginResponse;
}> {
  const session = await apiLogin(role);
  const ctx = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${session.tokens.accessToken}`,
      'x-branch-id': session.user.branchId,
      'Content-Type': 'application/json',
    },
  });
  return { ctx, session };
}

/** Anonymous context — for negative auth tests. */
export async function anonContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_URL });
}
