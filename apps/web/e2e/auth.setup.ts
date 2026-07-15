import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EMAIL = process.env.E2E_EMAIL || 'john@grace.org';
const PASSWORD = process.env.E2E_PASSWORD || 'grace2026';
const AUTH_FILE = 'e2e/.auth/super.json';

/**
 * Logs in through the real /login UI as the super-admin and saves the session
 * cookie so the rest of the suite starts authenticated.
 */
setup('authenticate as super-admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/login');
  await page.getByPlaceholder('name@grace.org').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: '登录' }).click();

  // On success the app redirects to the dashboard shell (sidebar brand shows).
  await expect(page.getByText('主恩堂').first()).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/$|\/(?!login)/);

  await page.context().storageState({ path: AUTH_FILE });
});
