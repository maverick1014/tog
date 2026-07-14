import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client for the API route handlers. Uses the service-role
 * key (full access, bypasses RLS) — never import this into client components.
 *
 * On Cloudflare Workers (OpenNext) and in `next dev`, the credentials come from
 * `process.env`. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY as Worker secrets
 * (or in .env for local dev).
 */
let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new HttpError(
      500,
      'Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** A typed HTTP error the route dispatcher turns into a JSON response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Throw a clean HTTP error when a Supabase query fails (mirrors the API). */
export function unwrap<T = Record<string, unknown>>(result: {
  data: T | null;
  error: { code?: string; message: string } | null;
}): T {
  if (result.error) {
    // PGRST116 = no rows returned for a `.single()` query.
    if (result.error.code === 'PGRST116') {
      throw new HttpError(404, 'Resource not found');
    }
    throw new HttpError(500, result.error.message);
  }
  if (result.data === null) {
    throw new HttpError(404, 'Resource not found');
  }
  return result.data;
}

export function json(data: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
