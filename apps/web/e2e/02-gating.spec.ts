import { test, expect } from '@playwright/test';
import { provisionAccount, deleteAccount, loginUI } from './helpers';

test.describe('角色可见性（访问控制）', () => {
  test('超级管理员侧栏包含「用户管理」', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar')).toContainText('用户管理');
  });

  test('只读账户门控：无用户管理、无写按钮、无删除、/settings 被拦', async ({ browser, request }) => {
    const acct = await provisionAccount(request, 'readonly');
    const ctx = await browser.newContext(); // fresh — not the super-admin session
    try {
      const page = await ctx.newPage();
      await loginUI(page, acct.email, acct.password);

      await expect(page.locator('.sidebar')).not.toContainText('用户管理');

      await page.goto('/members');
      await expect(page.getByRole('button', { name: /新增成员/ })).toHaveCount(0);

      // Open a member; no edit/delete/avatar controls
      await page.locator('table tr.row-click').first().click();
      await expect(page.getByRole('button', { name: '编辑资料' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);

      await page.goto('/settings');
      await expect(page.getByText('仅超级管理员可访问用户管理')).toBeVisible();
    } finally {
      await ctx.close();
      await deleteAccount(request, acct.id);
    }
  });

  test('管理员直接读 /api/accounts 返回 403', async ({ request }) => {
    const acct = await provisionAccount(request, 'admin');
    try {
      const login = await request.post('/api/auth/login', {
        data: { email: acct.email, password: acct.password },
      });
      const cookie = (login.headers()['set-cookie'] || '').split(';')[0];
      const res = await request.get('/api/accounts', { headers: { cookie } });
      expect(res.status()).toBe(403);
    } finally {
      await deleteAccount(request, acct.id);
    }
  });
});
