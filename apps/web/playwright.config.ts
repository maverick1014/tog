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
const BASE_URL = process.env.E2E_BASE_URL || 'https://tog.tabernacleofgrace-cn.workers.dev';
// Only pin an executable when explicitly told to (e.g. a sandbox with a
// pre-installed browser). In CI, `npx playwright install` provides the browser
// and Playwright resolves it automatically — a hardcoded path would break.
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH;

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
  retries: 0,
  // Hard cap so a hung/slow remote target can never make the job run forever;
  // the run always terminates and uploads a report to inspect.
  globalTimeout: 6 * 60_000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e/.results.json' }],
    ['html', { outputFolder: 'e2e/.report', open: 'never' }],
  ],
  timeout: 20_000,
  expect: { timeout: 6_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    proxy: PROXY ? { server: PROXY } : undefined,
    launchOptions: CHROMIUM ? { executablePath: CHROMIUM } : undefined,
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
