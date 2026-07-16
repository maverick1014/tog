import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:8899';
const OUT = '/tmp/claude-0/-home-user-tog/15744b6a-a867-54fd-93df-f11eba3619a5/scratchpad';
const wait = (p, ms = 1800) => p.waitForTimeout(ms);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 402, height: 880 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
}
async function shot(name, ms = 1800) {
  await wait(page, ms);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('shot', name);
}

await go('/login');
await shot('00-login');
await page.fill('input[type=email]', 'john@grace.org');
await page.fill('input[type=password]', 'grace2026');
await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
await shot('01-dashboard', 3200);

for (const [name, path] of [
  ['02-members', '/members'],
  ['04-groups', '/groups'],
  ['05-events', '/events'],
  ['06-trainings', '/trainings'],
  ['07-discipleship', '/discipleship'],
  ['09-settings', '/settings'],
]) {
  try { await go(path); await shot(name, 2600); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
}

try {
  await go('/members'); await wait(page, 2400);
  await page.locator('.mtile').first().click();
  await page.waitForURL(/\/members\/[0-9a-f-]+/, { timeout: 20000 }).catch(() => {});
  await shot('03-member-detail', 2600);
} catch (e) { console.log('FAIL member-detail', e.message.split('\n')[0]); }

try {
  await go('/discipleship'); await wait(page, 2600);
  await page.locator('.mtile').first().click();
  await shot('08-pair-modal', 2200);
} catch (e) { console.log('FAIL pair-modal', e.message.split('\n')[0]); }

try {
  await go('/trainings'); await wait(page, 2400);
  await page.locator('.card h3').first().click();
  await page.waitForURL(/\/trainings\/[0-9a-f-]+/, { timeout: 20000 }).catch(() => {});
  await shot('06b-training-detail', 2600);
} catch (e) { console.log('FAIL training-detail', e.message.split('\n')[0]); }

await browser.close();
console.log('DONE');
