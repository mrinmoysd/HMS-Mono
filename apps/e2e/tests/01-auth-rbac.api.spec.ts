import { test, expect } from '@playwright/test';
import { apiLogin, apiContextFor, anonContext } from '../src/api-client';
import { ROLES, PASSWORD } from '../src/config';

/**
 * TC-AUTH-* — authentication and RBAC at the API layer.
 * These run without a browser so failures point straight at the backend.
 */
test.describe('TC-AUTH — API authentication', () => {
  test('TC-AUTH-001 health endpoint reports db up', async () => {
    const ctx = await anonContext();
    const res = await ctx.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok', db: 'up' });
    await ctx.dispose();
  });

  test('TC-AUTH-002 every seeded role can log in', async () => {
    for (const role of ROLES) {
      const session = await apiLogin(role);
      expect(session.user.username, `login response for ${role}`).toBe(role);
      expect(session.tokens.accessToken).toBeTruthy();
      expect(session.tokens.refreshToken).toBeTruthy();
      expect(session.user.branchId, `${role} must belong to a branch`).toBeTruthy();
      expect(Array.isArray(session.user.permissions)).toBe(true);
    }
  });

  test('TC-AUTH-003 wrong password is rejected with 401', async () => {
    const ctx = await anonContext();
    const res = await ctx.post('/auth/login', {
      data: { username: 'superadmin', password: 'definitely-not-the-password' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('TC-AUTH-004 unknown username is rejected with 401 and no user enumeration', async () => {
    const ctx = await anonContext();
    const res = await ctx.post('/auth/login', {
      data: { username: 'no-such-user-e2e', password: PASSWORD },
    });
    expect(res.status()).toBe(401);
    const body = await res.text();
    expect(body.toLowerCase()).not.toContain('not found');
    await ctx.dispose();
  });

  test('TC-AUTH-005 malformed login payload is rejected with 400', async () => {
    const ctx = await anonContext();
    const res = await ctx.post('/auth/login', { data: { username: '' } });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('TC-AUTH-006 protected route rejects anonymous requests', async () => {
    const ctx = await anonContext();
    const res = await ctx.get('/patients');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('TC-AUTH-007 protected route rejects a garbage bearer token', async () => {
    const ctx = await anonContext();
    const res = await ctx.get('/patients', {
      headers: { Authorization: 'Bearer not.a.real.token' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('TC-AUTH-008 /auth/me echoes the authenticated principal', async () => {
    const { ctx, session } = await apiContextFor('superadmin');
    const res = await ctx.get('/auth/me');
    expect(res.status()).toBe(200);
    const me = await res.json();
    expect(me.id ?? me.sub).toBe(session.user.id);
    await ctx.dispose();
  });

  test('TC-AUTH-009 refresh token exchanges for a new access token', async () => {
    const session = await apiLogin('superadmin');
    const ctx = await anonContext();
    const res = await ctx.post('/auth/refresh', {
      data: { refreshToken: session.tokens.refreshToken },
    });
    expect(res.status()).toBe(200);
    const tokens = await res.json();
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    await ctx.dispose();
  });

  test('TC-AUTH-010 an access token is not accepted as a refresh token', async () => {
    const session = await apiLogin('superadmin');
    const ctx = await anonContext();
    const res = await ctx.post('/auth/refresh', {
      data: { refreshToken: session.tokens.accessToken },
    });
    expect(res.status(), 'access and refresh secrets must differ').toBe(401);
    await ctx.dispose();
  });
});

test.describe('TC-RBAC — permission enforcement', () => {
  test('TC-RBAC-001 super admin holds a non-empty permission set', async () => {
    const session = await apiLogin('superadmin');
    expect(session.user.permissions.length).toBeGreaterThan(0);
  });

  test('TC-RBAC-002 roles have materially different permission sets', async () => {
    const admin = await apiLogin('admin');
    const nurse = await apiLogin('nurse');
    expect(new Set(admin.user.permissions)).not.toEqual(new Set(nurse.user.permissions));
    expect(admin.user.permissions.length).toBeGreaterThan(nurse.user.permissions.length);
  });

  test('TC-RBAC-003 a role without patient.delete gets 403, not 500', async () => {
    const { ctx, session } = await apiContextFor('nurse');
    test.skip(
      session.user.permissions.includes('patient.delete'),
      'nurse unexpectedly has patient.delete; adjust the fixture role',
    );
    // Well-formed UUID so we exercise the guard, not the param pipe.
    const res = await ctx.delete('/patients/00000000-0000-4000-8000-000000000000');
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('TC-RBAC-004 permission-holding role reaches the handler (404, not 403)', async () => {
    const { ctx } = await apiContextFor('superadmin');
    const res = await ctx.get('/patients/00000000-0000-4000-8000-000000000000');
    expect([404, 400]).toContain(res.status());
    await ctx.dispose();
  });

  test('TC-RBAC-005 branch context is required for branch-scoped reads', async () => {
    const session = await apiLogin('superadmin');
    const ctx = await anonContext();
    const res = await ctx.get('/patients', {
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
    });
    // Either the interceptor falls back to the token's branch (200) or it rejects
    // cleanly (400/403). A 500 means "Branch context not resolved" leaked out.
    expect(res.status(), 'missing x-branch-id must not produce a 500').not.toBe(500);
    await ctx.dispose();
  });

  test('TC-RBAC-006 invalid UUID path param returns 400, not 500', async () => {
    const { ctx } = await apiContextFor('superadmin');
    const res = await ctx.get('/patients/not-a-uuid');
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('TC-RBAC-007 the literal /patients/lookup route is not shadowed by /:id', async () => {
    const { ctx } = await apiContextFor('superadmin');
    const res = await ctx.get('/patients/lookup?phone=9999999999');
    expect(res.status(), '/lookup must not be parsed as a UUID id').not.toBe(400);
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });
});
