import { test, expect } from '@playwright/test';

test.describe('用户管理（超级管理员）', () => {
  test('账户 新建 → 改角色 → 重设密码 → 删除 闭环', async ({ page }) => {
    const email = `e2e-acct-${Date.now().toString(36)}@grace.org`;
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '权限说明' })).toBeVisible();

    // Create
    await page.getByRole('button', { name: /新建账户/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.locator('select').first().selectOption({ index: 1 }); // 关联成员
    await add.getByPlaceholder('name@grace.org').fill(email);
    await add.locator('input[type="password"]').first().fill('e2ePass2026');
    await add.getByRole('button', { name: '创建账户' }).click();
    await expect(page.locator('.toast')).toContainText('已新建账户');

    // Open the new account
    await page.locator('tr', { hasText: email }).click();
    await expect(page.getByText(email)).toBeVisible();

    // Change role + save
    await page.locator('select').filter({ hasText: '管理员' }).first().selectOption({ label: '管理员' });
    await page.getByRole('button', { name: '保存账户设置' }).click();
    await expect(page.locator('.toast')).toContainText('已保存账户设置');

    // Reset the account password
    await page.getByPlaceholder('至少 8 位').fill('newPass2026');
    await page.getByRole('button', { name: '重设该账户密码' }).click();
    await expect(page.locator('.toast')).toContainText('重设密码');

    // Delete the account (danger confirm)
    await page.getByRole('button', { name: '删除账户' }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '删除账户' }).click();
    await expect(page.locator('.toast')).toContainText('已删除账户');
    await expect(page.locator('tr', { hasText: email })).toHaveCount(0);
  });

  test('新建账户校验：缺邮箱/密码报错', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /新建账户/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.locator('select').first().selectOption({ index: 1 });
    await add.getByRole('button', { name: '创建账户' }).click();
    await expect(add.locator('.error-banner')).toBeVisible();
  });
});
