#!/usr/bin/env node
/**
 * Post-deploy smoke test — hits the live Worker and asserts the core /api
 * endpoints return HTTP 200 with the expected shape.
 *
 * Usage:  node apps/web/scripts/smoke-test.mjs
 *         SMOKE_URL=https://example.workers.dev node apps/web/scripts/smoke-test.mjs
 *
 * Requires Node 20+ (global fetch). Exits 0 on success, 1 on any failure.
 */

const BASE = (process.env.SMOKE_URL || 'https://tog-web.tabernacleofgrace-cn.workers.dev').replace(
  /\/+$/,
  '',
);

async function getJson(path) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`GET ${url} failed to connect: ${err.message}`);
  }
  if (res.status !== 200) {
    throw new Error(`GET ${url} returned HTTP ${res.status} (expected 200)`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new Error(`GET ${url} did not return valid JSON: ${err.message}`);
  }
}

const checks = [
  {
    name: '/api/members returns an array',
    async run() {
      const data = await getJson('/api/members');
      if (!Array.isArray(data)) {
        throw new Error(`expected an array, got ${typeof data}`);
      }
    },
  },
  {
    name: '/api/donations/summary has numeric total + byFund object',
    async run() {
      const data = await getJson('/api/donations/summary');
      if (data == null || typeof data !== 'object') {
        throw new Error(`expected an object, got ${typeof data}`);
      }
      if (typeof data.total !== 'number' || Number.isNaN(data.total)) {
        throw new Error(`expected numeric "total", got ${JSON.stringify(data.total)}`);
      }
      if (data.byFund == null || typeof data.byFund !== 'object' || Array.isArray(data.byFund)) {
        throw new Error(`expected "byFund" object, got ${JSON.stringify(data.byFund)}`);
      }
    },
  },
  {
    name: '/api/discipleship/programs returns an array',
    async run() {
      const data = await getJson('/api/discipleship/programs');
      if (!Array.isArray(data)) {
        throw new Error(`expected an array, got ${typeof data}`);
      }
    },
  },
];

async function main() {
  console.log(`Smoke testing ${BASE}`);
  let failures = 0;
  for (const check of checks) {
    try {
      await check.run();
      console.log(`  PASS  ${check.name}`);
    } catch (err) {
      failures += 1;
      console.error(`  FAIL  ${check.name}\n        ${err.message}`);
    }
  }
  if (failures > 0) {
    console.error(`\nSmoke test FAILED: ${failures} of ${checks.length} checks failed.`);
    process.exit(1);
  }
  console.log(`\nSmoke test passed: all ${checks.length} checks OK.`);
  process.exit(0);
}

main();
