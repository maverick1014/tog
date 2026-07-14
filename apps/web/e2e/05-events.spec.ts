import { test, expect } from '@playwright/test';
import { uid } from './helpers';

test.describe('聚会与出席', () => {
  test('聚会 新增 → 编辑 → 点名 → 删除 闭环', async ({ page }) => {
    const title = uid('聚会');
    await page.goto('/events');

    // Create
    await page.getByRole('button', { name: /新增聚会/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByPlaceholder('例如：周三祷告会').fill(title);
    await add.locator('input[type="datetime-local"]').fill('2026-08-01T10:00');
    await add.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已新增聚会');

    const card = page.locator('.card', { hasText: title });
    await expect(card).toBeVisible();

    // Attendance modal
    await card.getByRole('button', { name: '点名' }).click();
    const att = page.locator('.modal-backdrop');
    await expect(att.getByText('出席点名')).toBeVisible();
    // Mark the first member present, then save.
    const seg = att.locator('.seg').first();
    if (await seg.count()) await seg.getByRole('button').first().click();
    await att.getByRole('button', { name: /保存点名/ }).click();
    await expect(page.locator('.toast')).toContainText('已保存点名');

    // Edit
    await card.getByRole('button', { name: '编辑' }).click();
    const edit = page.locator('.modal-backdrop');
    await expect(edit.getByText('编辑聚会')).toBeVisible();
    await edit.getByPlaceholder('例如：周三祷告会').fill(`${title}-改`);
    await edit.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.toast')).toContainText('已更新聚会');

    // Delete
    const card2 = page.locator('.card', { hasText: `${title}-改` });
    await card2.getByRole('button', { name: '删除' }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '删除' }).click();
    await expect(page.locator('.toast')).toContainText('已删除聚会');
    await expect(page.locator('.card', { hasText: `${title}-改` })).toHaveCount(0);
  });

  test('必填校验：缺标题或时间被拒绝', async ({ page }) => {
    await page.goto('/events');
    await page.getByRole('button', { name: /新增聚会/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByRole('button', { name: '保存' }).click();
    await expect(add.locator('.error-banner')).toContainText('请填写标题与开始时间');
  });
});
