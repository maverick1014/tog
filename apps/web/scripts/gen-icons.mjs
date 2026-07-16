#!/usr/bin/env node
/**
 * Rasterize the brand logo (public/icons/icon-source.svg) into the PNG sizes a
 * PWA needs: 192 / 512 (any) + 512 (maskable) + 180 apple-touch. Run manually
 * after changing the source art: `node scripts/gen-icons.mjs`. Uses the
 * preinstalled Chromium via Playwright — no network fetch.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url);
const svg = readFileSync(new URL('icon-source.svg', dir), 'utf8');

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { name, size } of targets) {
  const sized = svg.replace('width="512" height="512"', `width="${size}" height="${size}"`);
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:0">${sized}</body>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const el = await page.$('svg');
  const buf = await el.screenshot({ omitBackground: false });
  writeFileSync(new URL(name, dir), buf);
  console.log(`wrote ${name} (${size}x${size}, ${buf.length} bytes)`);
}
await browser.close();
