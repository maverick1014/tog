#!/usr/bin/env node
/**
 * Post-deploy smoke test. Verifies the live deployment end-to-end, including
 * that the API is protected by auth and that a valid login unlocks the data.
 *
 * Env:
 *   SMOKE_URL       base URL (default: the tog-web Worker)
 *   SMOKE_EMAIL     login email (default: john@grace.org)
 *   SMOKE_PASSWORD  login password (default: grace2026)
 *
 * Requires Node 20+ (global fetch). Exits 0 on success, 1 on any failure.
 */

const BASE = (process.env.SMOKE_URL || 'https://tog-web.tabernacleofgrace-cn.workers.dev').replace(
  /\/+$/,
  '',
);
const EMAIL = process.env.SMOKE_EMAIL || 'john@grace.org';
const PASSWORD = process.env.SMOKE_PASSWORD || 'grace2026';

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
    failures += 1;
  }
}

async function main() {
  console.log(`Smoke testing ${BASE}`);

  // 1) Homepage serves.
  const home = await fetch(`${BASE}/`);
  check('homepage returns 200', home.status === 200, `got ${home.status}`);

  // 2) API is protected — no session must be rejected.
  const noAuth = await fetch(`${BASE}/api/members`);
  check('unauthenticated /api/members is 401', noAuth.status === 401, `got ${noAuth.status}`);

  // 3) Login issues a session cookie.
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  check('login returns 200', login.status === 200, `got ${login.status}`);
  const setCookie = login.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  check('login sets tog_session cookie', cookie.startsWith('tog_session='), setCookie.slice(0, 48));

  const authed = { headers: { cookie } };

  // 4) Authenticated data endpoints return the expected shapes.
  const members = await fetch(`${BASE}/api/members`, authed).then((r) => r.json());
  check('members is a non-empty array', Array.isArray(members) && members.length > 0);

  const summary = await fetch(`${BASE}/api/donations/summary`, authed).then((r) => r.json());
  check(
    'donations summary has numeric total + byFund object',
    summary &&
      typeof summary.total === 'number' &&
      summary.byFund &&
      typeof summary.byFund === 'object' &&
      !Array.isArray(summary.byFund),
  );

  const programs = await fetch(`${BASE}/api/discipleship/programs`, authed).then((r) => r.json());
  check('programs is an array', Array.isArray(programs));

  if (failures > 0) {
    console.error(`\nSmoke test FAILED: ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nSmoke test passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Smoke test error:', e);
  process.exit(1);
});
