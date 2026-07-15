import { test, expect } from '@playwright/test';
import { uid } from './helpers';

test.describe('成员目录', () => {
  test('成员 新增 → 编辑 → 删除 闭环', async ({ page }) => {
    const name = uid('成员');
    await page.goto('/members');

    // Create
    await page.getByRole('button', { name: /新增成员/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByPlaceholder('中文姓名').fill(name);
    await add.getByPlaceholder('012-000 0000').fill('012-555 0000');
    await add.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已新增成员');

    // Open detail
    await page.locator('table').getByText(name, { exact: true }).click();
    await expect(page.locator('h2')).toContainText(name);

    // Update
    await page.getByRole('button', { name: '编辑资料' }).click();
    const edit = page.locator('.modal-backdrop');
    await edit.getByPlaceholder('012-000 0000').fill('012-555 9999');
    await edit.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已保存资料');
    await expect(page.getByText('012-555 9999')).toBeVisible();

    // Delete (danger confirm) → back to directory
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '删除', exact: true }).click();
    await expect(page).toHaveURL(/\/members$/, { timeout: 15_000 });
    await expect(page.locator('table').getByText(name, { exact: true })).toHaveCount(0);
  });

  test('身份筛选与搜索', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('button', { name: /全部/ })).toBeVisible();
    // Search for an unlikely string → empty state.
    await page.getByPlaceholder('🔍 搜索姓名…').fill('ZZZ-不存在的人');
    await expect(page.getByText('没有符合条件的成员。')).toBeVisible();
  });

  test('导出 Excel 触发下载', async ({ page }) => {
    await page.goto('/members');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: /导出 Excel/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
