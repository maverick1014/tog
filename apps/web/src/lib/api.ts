// Default to same-origin: the API now lives in Next.js route handlers under
// /api (which run on the Cloudflare Workers runtime via OpenNext). Set
// NEXT_PUBLIC_API_URL only if you want to point at a standalone API host
// (e.g. the legacy NestJS server on :4000).
const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { BASE as API_BASE };
