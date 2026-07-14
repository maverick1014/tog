import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the TOG church-management app.
 *
 * Target: by default the live Cloudflare Worker deployment (override with
 * E2E_BASE_URL). Login credentials come from E2E_EMAIL / E2E_PASSWORD
 * (default: the bootstrap super-admin). Chromium is the pre-installed browser
 * in this environment — we point executablePath at it rather than downloading.
 *
 * The suite runs single-worker because it exercises a shared live database;
 * every write flow creates uniquely-named data and deletes it again so the
 * demo data stays clean.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'https://tog-web.tabernacleofgrace-cn.workers.dev';
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';

// In this sandbox outbound HTTPS must traverse the agent proxy, which
// TLS-intercepts. Route the test browser through it and (only for the test
// browser context, not system-wide) accept its cert so navigations succeed.
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    proxy: PROXY ? { server: PROXY } : undefined,
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    // 1) Authenticate once as super_admin and persist the session cookie.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // 2) All flows reuse that session unless a spec logs in itself.
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/super.json',
      },
    },
  ],
});
