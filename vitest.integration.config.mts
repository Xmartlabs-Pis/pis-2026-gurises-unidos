import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['integration/**/*.test.ts'],
    globalSetup: ['./e2e/global-setup.ts'],
    setupFiles: ['./integration/setup.ts'],
    env: { DATABASE_URL: process.env.E2E_DATABASE_URL ?? '' },
    fileParallelism: false,
    testTimeout: 20_000,
    server: { deps: { inline: ['next-auth'] } },
  },
});
