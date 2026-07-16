#!/usr/bin/env node
/**
 * Produce a transparent-background version of the brand logo for in-app use
 * (public/logo.png). The source logo (logo-source.png) uses white for BOTH the
 * background AND the globe's grid lines, so a plain color-key would erase the
 * grid. Instead we flood-fill transparency inward from the border, stopping at
 * the first non-white pixel — this removes the surrounding white while leaving
 * the enclosed grid lines intact. Run: `node scripts/gen-logo-transparent.mjs`.
 * Uses the preinstalled Chromium (no network).
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const iconsDir = new URL('../public/icons/', import.meta.url);
const logo = readFileSync(new URL('logo-source.png', iconsDir));
const dataUri = `data:image/png;base64,${logo.toString('base64')}`;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const png = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.getElementById('c');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  const T = 238; // near-white threshold
  const isWhite = (i) => d[i] >= T && d[i + 1] >= T && d[i + 2] >= T;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { if (x >= 0 && x < w && y >= 0 && y < h) stack.push(y * w + x); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!isWhite(i)) continue;
    d[i + 3] = 0; // make transparent
    const x = p % w, y = (p - x) / w;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  ctx.putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
}, dataUri);

const b64 = png.replace(/^data:image\/png;base64,/, '');
writeFileSync(new URL('../public/logo.png', import.meta.url), Buffer.from(b64, 'base64'));
console.log('wrote public/logo.png (transparent background)');
await browser.close();
