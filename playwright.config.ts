import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const LOCAL_PORT = 3100;
const externalTarget = process.env.E2E_BASE_URL;
const baseURL = externalTarget ?? `http://localhost:${LOCAL_PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: externalTarget
    ? undefined
    : {
        command: `npm run dev -- --port ${LOCAL_PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: false,
        env: {
          DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
          AUTH_URL: baseURL,
          AUTH_TRUST_HOST: 'true',
        },
        timeout: 120_000,
      },
});
