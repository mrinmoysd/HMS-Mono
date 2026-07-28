import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

/**
 * Smart Hospital — end-to-end test configuration.
 *
 * Assumes the stack is already reachable:
 *   pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev
 *
 * Set E2E_MANAGE_SERVERS=1 to let Playwright boot `pnpm dev` itself.
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3001';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';
const MANAGE_SERVERS = process.env.E2E_MANAGE_SERVERS === '1';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // Data-mutating specs share one seeded database, so keep files serial by default.
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  globalSetup: require.resolve('./src/global-setup'),

  use: {
    baseURL: WEB_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { baseURL: API_URL },
    },
    {
      name: 'chromium',
      testIgnore: /.*\.api\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: MANAGE_SERVERS
    ? {
        command: 'pnpm --dir ../.. dev',
        url: `${WEB_URL}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});

export const paths = {
  storageState: (role: string) => path.join(__dirname, '.auth', `${role}.json`),
};
