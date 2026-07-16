#!/usr/bin/env node
/**
 * Rasterize the brand logo (public/icons/logo-source.png — the official
 * Tabernacle of Grace mark) into the icon set a PWA needs. Run manually after
 * replacing the source art: `node scripts/gen-icons.mjs`. Uses the preinstalled
 * Chromium via Playwright — no network fetch.
 *
 * Outputs (all on the logo's white background):
 *   public/icons/icon-192.png     192  manifest, any
 *   public/icons/icon-512.png     512  manifest, any
 *   public/icons/maskable-512.png 512  manifest, maskable (padded to safe zone)
 *   src/app/icon.png              64   favicon           (Next file convention)
 *   src/app/apple-icon.png        180  apple-touch-icon  (Next file convention)
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const iconsDir = new URL('../public/icons/', import.meta.url);
const appDir = new URL('../src/app/', import.meta.url);
const logo = readFileSync(new URL('logo-source.png', iconsDir));
const dataUri = `data:image/png;base64,${logo.toString('base64')}`;

// pad = fraction of the canvas left empty on EACH side around the logo.
const targets = [
  { out: new URL('icon-192.png', iconsDir), size: 192, pad: 0.03 },
  { out: new URL('icon-512.png', iconsDir), size: 512, pad: 0.03 },
  { out: new URL('maskable-512.png', iconsDir), size: 512, pad: 0.14 },
  { out: new URL('apple-icon.png', appDir), size: 180, pad: 0.06 },
  { out: new URL('icon.png', appDir), size: 64, pad: 0.02 },
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { out, size, pad } of targets) {
  const content = Math.round(size * (1 - 2 * pad));
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:#ffffff;display:flex;align-items:center;justify-content:center">
      <img src="${dataUri}" style="width:${content}px;height:${content}px;object-fit:contain" />
    </div></body>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(out, buf);
  console.log(`wrote ${out.pathname.split('/').slice(-1)[0]} (${size}x${size}, pad ${pad}, ${buf.length} bytes)`);
}
await browser.close();
