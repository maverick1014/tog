import { test, expect } from '@playwright/test';
import { SUPER_EMAIL, SUPER_PASSWORD, loginUI } from './helpers';

// These run WITHOUT the saved super-admin session.
test.describe('认证与会话', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('登录成功跳转仪表盘', async ({ page }) => {
    await loginUI(page, SUPER_EMAIL, SUPER_PASSWORD);
    await expect(page.locator('.nav-user')).toContainText('超级管理员');
  });

  test('登录失败（错误密码）显示错误', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('name@grace.org').fill(SUPER_EMAIL);
    await page.locator('input[type="password"]').first().fill('wrong-password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('未登录访问受保护页重定向到登录', async ({ page }) => {
    await page.goto('/members');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('密码字段可切换显示/隐藏', async ({ page }) => {
    await page.goto('/login');
    const pw = page.locator('input[type="password"]').first();
    await pw.fill('secret123');
    await page.locator('.pw-toggle').click();
    await expect(page.locator('input[type="text"]')).toHaveValue('secret123');
  });
});

test.describe('会话内操作', () => {
  test('退出登录：取消后仍在应用内，确认后回到登录页', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-user')).toBeVisible();
    // Open the account menu, click 退出登录 → cancel.
    await page.locator('.nav-user').click();
    await page.locator('.nav-user-menu').getByRole('button', { name: '退出登录' }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '取消' }).click();
    await expect(page.locator('.nav-user')).toBeVisible();

    // Now confirm the logout.
    await page.locator('.nav-user').click();
    await page.locator('.nav-user-menu').getByRole('button', { name: '退出登录' }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('自助改密：新密码过短时报错', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-user').click();
    await page.locator('.nav-user-menu').getByRole('button', { name: '修改我的密码' }).click();
    const modal = page.locator('.modal-backdrop');
    await expect(modal.getByText('修改我的密码')).toBeVisible();
    const pws = modal.locator('input[type="password"]');
    await pws.nth(0).fill(SUPER_PASSWORD);
    await pws.nth(1).fill('short');
    await pws.nth(2).fill('short');
    await modal.getByRole('button', { name: '更新密码' }).click();
    await expect(modal.locator('.error-banner')).toContainText('至少 8 位');
    await modal.getByRole('button', { name: '取消' }).click();
  });
});
