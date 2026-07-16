// Localhost reverse-proxy: the sandbox browser can't tunnel through the egress
// proxy, but Node fetch can (NODE_USE_ENV_PROXY=1). Bridge the two: Chromium
// hits http://127.0.0.1:8899 and every request is replayed against the live
// Worker, cookies and all — so screenshots show the REAL deployed site.
import { createServer } from 'node:http';

const BASE = 'https://tog.tabernacleofgrace-cn.workers.dev';

const server = createServer(async (req, res) => {
  try {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'accept-encoding'].includes(k)) continue;
      headers[k] = v;
    }
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = chunks.length ? Buffer.concat(chunks) : undefined;
    }
    const r = await fetch(BASE + req.url, { method: req.method, headers, body, redirect: 'manual' });

    const out = {};
    r.headers.forEach((v, k) => {
      if (['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie', 'strict-transport-security'].includes(k)) return;
      out[k] = v;
    });
    if (out.location) out.location = out.location.replace(BASE, '');
    const cookies = r.headers.getSetCookie?.() ?? [];
    if (cookies.length) out['set-cookie'] = cookies.map((c) => c.replace(/;\s*Secure/gi, ''));

    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, out);
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(String(e));
  }
});

server.listen(8899, '127.0.0.1', () => console.log('mirror listening on http://127.0.0.1:8899'));
