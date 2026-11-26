import { defineConfig } from '@playwright/test';

// Deliberately separate from browser E2E: no Vite server, browser substitute,
// skipped native tests or test-only renderer privilege changes.
export default defineConfig({
  testDir: './tests/desktop',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/desktop/preflight.ts',
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: 'test-results/desktop',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/desktop', open: 'never' }]],
});
