import { Page, APIRequestContext, expect } from '@playwright/test';

export const SUPER_EMAIL = process.env.E2E_EMAIL || 'john@grace.org';
export const SUPER_PASSWORD = process.env.E2E_PASSWORD || 'grace2026';

/** A short unique suffix so parallel/repeat runs never collide on names.
 *  Date is available in the Node test runtime (not a workflow script). */
export function uid(prefix = 'E2E'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

/** Log in through the real /login UI and wait for the app shell. */
export async function loginUI(page: Page, email = SUPER_EMAIL, password = SUPER_PASSWORD) {
  await page.goto('/login');
  await page.getByPlaceholder('name@grace.org').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.locator('.nav-user')).toBeVisible({ timeout: 15_000 });
}

/** Dismiss the shared confirm dialog by its confirm/cancel button label. */
export async function confirmDialog(page: Page, button = '删除') {
  await page.locator('.modal-backdrop').getByRole('button', { name: button }).click();
}

/* -------------------------------------------------------------------------
 * API helpers (used to provision/tear down throwaway accounts for the
 * role-gating tests, and for direct access-control assertions).
 * ---------------------------------------------------------------------- */

export async function apiLogin(
  request: APIRequestContext,
  email = SUPER_EMAIL,
  password = SUPER_PASSWORD,
): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  expect(res.status(), 'super-admin api login').toBe(200);
  const setCookie = res.headers()['set-cookie'] || '';
  const cookie = setCookie.split(';')[0];
  expect(cookie).toContain('tog_session=');
  return cookie;
}

export type ProvisionedAccount = {
  id: string;
  email: string;
  password: string;
  memberId: string;
};

/**
 * Create a throwaway login account with the given role on some member that
 * doesn't already have one, using a super-admin session. Returns credentials +
 * ids so the test can log in as it and then delete it.
 */
export async function provisionAccount(
  request: APIRequestContext,
  role: string,
): Promise<ProvisionedAccount> {
  const cookie = await apiLogin(request);
  const headers = { cookie };

  const members = (await (await request.get('/api/members', { headers })).json()) as Array<{ id: string }>;
  const accounts = (await (await request.get('/api/accounts', { headers })).json()) as Array<{ member_id: string }>;
  const taken = new Set(accounts.map((a) => a.member_id));
  const free = members.find((m) => !taken.has(m.id));
  if (!free) throw new Error('no member without an account to provision an E2E role account');

  const email = `e2e-${role}-${Date.now().toString(36)}@grace.org`;
  const password = 'e2ePass2026';
  const created = (await (
    await request.post('/api/accounts', {
      headers,
      data: { member_id: free.id, email, account_role: role, password },
    })
  ).json()) as { id: string };

  return { id: created.id, email, password, memberId: free.id };
}

export async function deleteAccount(request: APIRequestContext, id: string) {
  const cookie = await apiLogin(request);
  await request.delete(`/api/accounts/${id}`, { headers: { cookie } });
}
