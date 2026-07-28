import { request } from '@playwright/test';
import * as fs from 'node:fs';
import { API_URL, WEB_URL, AUTH_DIR, AUTH_STORAGE_KEY, ROLES, storageStateFor } from './config';
import { apiLogin } from './api-client';

/**
 * Runs once before the suite:
 *   1. Verifies API + DB + web are actually up (fails fast with a useful message).
 *   2. Verifies the demo users exist (i.e. `pnpm db:seed` was run).
 *   3. Writes a Playwright storageState per role by seeding the zustand
 *      `sh-auth` localStorage entry that apps/web reads on boot.
 */
async function waitFor(url: string, label: string, timeoutMs = 60_000): Promise<void> {
  const ctx = await request.newContext();
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  try {
    while (Date.now() < deadline) {
      try {
        const res = await ctx.get(url, { timeout: 5_000 });
        if (res.status() < 500) return;
        lastError = `HTTP ${res.status()}`;
      } catch (err) {
        lastError = (err as Error).message;
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
  } finally {
    await ctx.dispose();
  }
  throw new Error(
    `[e2e] ${label} not reachable at ${url} after ${timeoutMs / 1000}s (last error: ${lastError}).\n` +
      `Start the stack first:\n` +
      `  pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`,
  );
}

export default async function globalSetup(): Promise<void> {
  await waitFor(`${API_URL}/health`, 'API');
  await waitFor(`${WEB_URL}/login`, 'Web app');

  // DB must be genuinely up, not just the process.
  const health = await request.newContext();
  const healthRes = await health.get(`${API_URL}/health`);
  const healthBody = (await healthRes.json()) as { status: string; db: string };
  await health.dispose();
  if (healthBody.db !== 'up') {
    throw new Error(`[e2e] API reports db="${healthBody.db}". Run: pnpm db:up && pnpm db:migrate`);
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const origin = new URL(WEB_URL).origin;

  for (const role of ROLES) {
    let session;
    try {
      session = await apiLogin(role);
    } catch (err) {
      throw new Error(
        `[e2e] Could not log in as "${role}". Did you run \`pnpm db:seed\`?\n${(err as Error).message}`,
      );
    }

    const persisted = {
      state: {
        user: session.user,
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        activeBranchId: session.user.branchId,
      },
      version: 0,
    };

    fs.writeFileSync(
      storageStateFor(role),
      JSON.stringify(
        {
          cookies: [],
          origins: [
            {
              origin,
              localStorage: [{ name: AUTH_STORAGE_KEY, value: JSON.stringify(persisted) }],
            },
          ],
        },
        null,
        2,
      ),
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[e2e] Auth states written for ${ROLES.length} roles → ${AUTH_DIR}`);
}
