# TOG（主恩堂）Codebase Guide & Golden Rules

Church-management app. Next.js 15 (App Router, React 19) + Supabase, deployed to
Cloudflare Workers via OpenNext. All UI is Simplified Chinese; light theme only;
mobile-first. The API is a single catch-all route handler at
`apps/web/src/app/api/[...path]/route.ts`; auth is a signed HMAC cookie
(`lib/server/auth.ts`).

Run before every push: `npm run --workspace @tog/web -s build` (or in
`apps/web`: `npx tsc --noEmit && npm test && npm run build`). Deploys are gated
on unit tests + a post-deploy smoke test (`.github/workflows/deploy.yml`).

---

## GOLDEN RULES — every auditor / code reviewer MUST check these

These are hard requirements for this codebase. A change that breaks one is a
review finding, not a preference. Cite the rule number in the finding.

### G1 — CRUD completeness on every management page
Every entity page (成员、小组、聚会、奉献、培训、四十天守望配对、账户) must offer the
full set its users need: **Create, Read, Update, Delete**. If the API supports an
operation, the UI must expose it (or the omission must be a deliberate,
documented decision). A page that can only create + list is incomplete.

### G2 — Access control is enforced server-side AND reflected in the UI
- **Server (authoritative):** every non-public API path goes through the gate in
  `route.ts`. Writes are denied for `readonly`; account management
  (`/accounts*`, both **read and write**) is `super_admin` only; `DELETE` is
  `super_admin`/`admin` only. Sensitive reads (account emails/roles) must be
  role-gated too — never rely on "GET is harmless".
- **Client (UX):** never render an action a user's role cannot perform. Fetch the
  session role (`/api/auth/me`) and hide/disable nav items, buttons, and whole
  pages the role isn't allowed to use. A button that only ever returns 403 is a
  bug. The single public exception is the mentor form under
  `/api/discipleship/form/*` (+ `/api/auth/*`).

### G3 — Every destructive action shows a confirmation
Any delete/remove/detach/irreversible action (`api.delete(...)`, or a mutation
like 移除/清空/重置 that discards data) MUST go through the shared
`useConfirm()` dialog (`components/ui.tsx`) with `danger: true`. Native
`window.confirm` is not allowed. No silent destructive taps.

### G4 — One mechanism, not per-page reimplementations (altitude)
Reuse the shared primitives instead of re-rolling them per page:
`Modal`, `Field`, `PasswordInput`, `useConfirm`, `useToast`, `RoleBadge`,
`Avatar`, `PairProgressModal`, `exportRows`/`exportMatrix` (`lib/export.ts`),
`api` (`lib/api.ts`), and the label/style helpers in `lib/labels.ts`
(`roleTagStyle`, `roleDot`, `memberRoleZh`, `positionZh`, status/category
classes). New code that duplicates one of these is a finding — name the helper
to call instead. Colours come from CSS tokens / `ROLE_TAG`, never hard-coded hex
in components.

### G5 — Data fetch/derive once; simplify state
Don't map the same collection twice (e.g. desktop table + mobile tiles) with the
logic duplicated — compute the row model once and feed both, or use one
presentational component. Don't keep state you can derive from props/fetch.
Prefer `useFetch` + `useMemo` over manual effect/loading bookkeeping.

### G6 — Performance & correctness hygiene
- Lazy-load heavy libs on use (SheetJS for exports already does this); never add
  them to the initial bundle or to module top-level.
- API route handlers stay dynamic (`export const dynamic = 'force-dynamic'`) so
  the auth gate always runs and GET responses are never statically cached.
- No blocking work in render; run independent awaits together.
- Guard every list access and optional join (`x?.y ?? fallback`); Supabase
  embedded selects can be null.
- Passwords: PBKDF2 hash server-side only, min 8 chars, never stored/logged in
  plaintext; password fields use `PasswordInput` (show/hide) with the right
  `autoComplete`.

### G7 — Mobile-first & theme
Tables become list tiles on small screens (`.only-desktop` / `.only-mobile`
helpers). Two-column layouts collapse to a single full-width column on tablet
and below. Light theme only — no dark-mode branches or `data-theme` code.

### G8 — Conventions
- All user-facing strings are Simplified Chinese.
- Match surrounding code: functional components, hooks at top, shared `ui.tsx`
  building blocks, no new CSS frameworks.
- Keep `docs/` and this file in sync when a rule or flow changes.

---

## Reviewer output
Report findings most-severe first. Correctness/security (G2, G3, G6) outrank
CRUD gaps (G1) which outrank cleanup/altitude (G4, G5). Every finding cites a
concrete failure scenario and, where applicable, the golden-rule number.
