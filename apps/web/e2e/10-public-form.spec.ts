import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers';

test.describe('公开门训表单 /d/[token]', () => {
  test('无需登录即可打开并提交今日进度', async ({ page, request }) => {
    // Grab a real pair token via an authed API call (the form itself is public).
    const cookie = await apiLogin(request);
    const pairs = (await (await request.get('/api/discipleship/pairs', { headers: { cookie } })).json()) as Array<{
      form_token: string;
    }>;
    test.skip(!pairs?.length, '无配对可测公开表单');
    const token = pairs[0].form_token;

    await page.goto(`/d/${token}`);
    await expect(page.getByText('四十天一对一守望')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: '已完成' }).click();
    await page.getByRole('button', { name: /提交今日进度/ }).click();
    await expect(page.getByText('已提交，感谢你的守望 🙏')).toBeVisible({ timeout: 15_000 });
  });
});
