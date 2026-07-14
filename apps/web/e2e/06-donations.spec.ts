import { test, expect } from '@playwright/test';

test.describe('奉献管理', () => {
  test('奉献 录入 → 编辑 → 删除 闭环', async ({ page }) => {
    await page.goto('/donations');
    const rows = () => page.locator('.card table tbody tr');
    const before = await rows().count();

    // Create (anonymous, unique amount, today → lands at the top of the list)
    const amount = (Math.floor(Math.random() * 90000) + 10000).toString();
    await page.getByRole('button', { name: /录入奉献/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByPlaceholder('0.00').fill(amount);
    await add.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已录入奉献');
    await expect(rows()).toHaveCount(before + 1);

    // Update the newest row
    const first = rows().first();
    await first.getByRole('button', { name: '编辑' }).click();
    const edit = page.locator('.modal-backdrop');
    await expect(edit.getByText('编辑奉献')).toBeVisible();
    await edit.getByPlaceholder('0.00').fill('222');
    await edit.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已更新奉献');

    // Delete the newest row (danger confirm)
    await rows().first().getByRole('button', { name: '删除' }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '删除' }).click();
    await expect(page.locator('.toast')).toContainText('已删除奉献记录');
    await expect(rows()).toHaveCount(before);
  });

  test('金额校验：0 或负数被拒绝', async ({ page }) => {
    await page.goto('/donations');
    await page.getByRole('button', { name: /录入奉献/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByPlaceholder('0.00').fill('0');
    await add.getByRole('button', { name: '保存' }).click();
    await expect(add.locator('.error-banner')).toContainText('有效金额');
  });

  test('导出 Excel 触发下载', async ({ page }) => {
    await page.goto('/donations');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: /导出 Excel/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
