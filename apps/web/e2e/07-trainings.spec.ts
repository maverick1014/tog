import { test, expect } from '@playwright/test';
import { uid } from './helpers';

test.describe('培训课程', () => {
  test('课程 新增 → 加场次 → 删除 闭环', async ({ page }) => {
    const name = uid('课程');
    await page.goto('/trainings');

    // Create
    await page.getByRole('button', { name: /新增课程/ }).click();
    const add = page.locator('.modal-backdrop');
    await add.getByPlaceholder('例如：门徒训练 101').fill(name);
    await add.getByRole('button', { name: '保存' }).click();

    const card = page.locator('.card', { hasText: name });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Open detail
    await card.getByRole('button', { name: '名单' }).click();
    await expect(page.getByRole('heading', { name: name })).toBeVisible();

    // Add a session
    await page.getByRole('button', { name: /加场次/ }).click();
    const sess = page.locator('.modal-backdrop');
    await expect(sess.getByText('新增场次')).toBeVisible();
    await sess.getByPlaceholder('得救确据').fill('第一课');
    await sess.getByRole('button', { name: '保存' }).click();
    await expect(sess).toHaveCount(0);

    // Delete the course → back to the list
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await page.locator('.modal-backdrop').getByRole('button', { name: '删除', exact: true }).click();
    await expect(page).toHaveURL(/\/trainings$/, { timeout: 15_000 });
    await expect(page.locator('.card', { hasText: name })).toHaveCount(0);
  });

  test('名单导出触发下载（若有学员）', async ({ page }) => {
    await page.goto('/trainings');
    const firstCard = page.locator('.card').filter({ hasText: '名单' }).first();
    if (!(await firstCard.count())) test.skip(true, '无课程可测');
    await firstCard.getByRole('button', { name: '名单' }).click();
    const exportBtn = page.getByRole('button', { name: /导出名单/ });
    if (await exportBtn.isEnabled()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });
});
