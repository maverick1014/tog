# Deploying to Cloudflare Workers

The web app (`apps/web`) runs entirely on **Cloudflare Workers** via the
[OpenNext](https://opennext.js.org/cloudflare) adapter. This includes both the
Next.js frontend **and the REST API** — the API was ported from the standalone
NestJS server into Next.js route handlers at `src/app/api/[...path]/route.ts`,
which execute on the Workers runtime. Data lives in **Supabase** (Postgres).

```
Browser ── same-origin /api/* ──▶ Cloudflare Worker (Next.js + route handlers) ──▶ Supabase
```

> The legacy NestJS app in `apps/api` is no longer required for deployment. It
> still works for local development if you prefer it (set `NEXT_PUBLIC_API_URL`
> to point at it), but by default the frontend calls the same-origin route
> handlers, so `next dev` alone serves the whole app.

## One-time setup

### 1. GitHub secrets (for the deploy Action)
Already set by you:
- `CLOUDFLARE_API_TOKEN` — token with the **Edit Cloudflare Workers** permission
- `CLOUDFLARE_ACCOUNT_ID`

### 2. Supabase project + schema
Create a Supabase project, then apply the schema and seed:
```bash
supabase link --project-ref <your-ref>
supabase db push          # applies migrations 0001_init + 0002_app_users
# optionally load demo data:
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

### 3. Worker runtime secrets (so `/api` can reach Supabase)
Set these **in Cloudflare** (they persist across deploys):
```bash
cd apps/web
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
(or add them under Workers → tog-web → Settings → Variables and Secrets.)

## Deploy

Automatic — the **Deploy web to Cloudflare Workers** Action
(`.github/workflows/deploy.yml`) runs on every push to the base or working
branch that touches `apps/web` / `packages/shared`, or via **Run workflow**
(manual dispatch). It builds `@tog/shared`, runs the OpenNext build, and
`wrangler deploy`s the Worker (`tog-web`).

Manual deploy from your machine:
```bash
npm run build -w @tog/shared
npm run cf:deploy -w @tog/web   # opennext build + wrangler deploy
```

Local preview of the Workers bundle:
```bash
npm run cf:preview -w @tog/web
```
