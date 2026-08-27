import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  // Only the browser e2e specs; keeps Playwright from collecting Vitest
  // `*.test.ts` unit tests (which clash on the jest-matchers global).
  testDir: './tests/browser',

  retries: process.env.CI ? 3 : 0,

  timeout: 60 * 1000,

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe'
  },

  use: {
    baseURL: 'http://localhost:3000',
    permissions: ['clipboard-read', 'clipboard-write']
  }
});
