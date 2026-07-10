# campusrun.network — Mobile Capture Page

The first brick of campusrun.network. At a Campus Run drop, someone gets a free
product, taps an NFC card, and this page opens. It does exactly two things:

1. **How stoked are you?** — a 1–5 rating, one tap (required).
2. **Email** — optional. Free stuff has no strings; we store the rating either way.

Whole interaction is built to finish in under 10 seconds on bad festival LTE.

- Capture page: **`/stoked`**
- Read the data: **`/admin`** (a plain table) or **`/api/export`** (CSV) — both password-gated
- No accounts, no dashboard, no analytics. A small brick, well laid.

---

## Attribution (the important part)

Every submission is tagged with URL params so one page serves every drop for every brand.
NFC cards are written once with a params URL and reused forever.

| Param | Meaning            | Example         |
| ----- | ------------------ | --------------- |
| `e`   | event / drop id    | `rotm25`, `ucla-w1` |
| `b`   | brand              | `daps`, `lg`    |
| `c`   | card number (opt.) | `42`            |

Example card URL: `https://campusrun.network/stoked?e=rotm25&b=daps&c=42`

Missing params never break a submit — they store as `null`.

**Stored per submission:** timestamp, rating, email (nullable), `e`, `b`, `c`, user agent.
Nothing else. (IP is used only for rate-limiting and is never stored.)

---

## Tech stack

| Layer   | Choice                                  | Why                                            |
| ------- | --------------------------------------- | ---------------------------------------------- |
| App     | Next.js (App Router) + TypeScript       | `/stoked` is a static shell → instant on LTE   |
| Styling | Tailwind v4                             | Palette baked into `app/globals.css`           |
| DB      | Postgres — **Neon** in prod             | Serverless pooler absorbs festival write bursts |
| ORM     | Drizzle                                 | Typed schema, migrations in git                |
| Host    | Vercel                                  | Static edge + serverless API, preview per PR   |

---

## Local development

Prereqs: Node 22, Docker.

```bash
npm ci
cp .env.example .env.local        # then edit if you like
npm run db:up                     # local Postgres in Docker (host port 5439)
npm run db:migrate
npm run db:seed                   # optional: a few demo rows
npm run dev                       # http://localhost:3000
```

Test it: open `http://localhost:3000/stoked?e=test&b=daps`, rate, submit (with and
without an email). View rows at `/admin` (user/pass from `.env.local`).

### Scripts

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Dev server                                |
| `npm run build`      | Production build                          |
| `npm run db:up` / `db:down` | Start / stop local Postgres        |
| `npm run db:generate`| Generate a migration from schema changes  |
| `npm run db:migrate` | Apply migrations                          |
| `npm run db:seed`    | Insert demo rows                          |
| `npm test`           | Unit tests (Vitest)                       |
| `npm run e2e`        | End-to-end tests (Playwright)             |
| `npm run typecheck`  | `tsc --noEmit`                            |

---

## Testing

- **Unit** (`npm test`): validation + CSV escaping.
- **E2E** (`npm run e2e`): the "Done means" flow on mobile Safari + Chrome.

E2E is most reliable against a production build (dev mode can hit Turbopack
cold-compile races). CI does this automatically. To reproduce locally:

```bash
npm run build
PORT=3210 npm run start &
E2E_BASE_URL=http://localhost:3210 npm run e2e
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit, build, and e2e on every PR.

---

## Deployment (Vercel + Neon)

1. **Neon**: create a project. Copy the **pooled** connection string
   (`…-pooler.neon.tech`) — this is your production `DATABASE_URL`.
2. **Vercel**: import the repo. Set env vars (Production + Preview):
   - `DATABASE_URL` — Neon pooled string
   - `ADMIN_USER`, `ADMIN_PASSWORD` — a strong credential
   - (optional) `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to turn on bot checks
3. **Run migrations against prod** once (from your machine, with prod `DATABASE_URL`):
   `DATABASE_URL=<neon-pooled-url> npm run db:migrate`
4. Point `campusrun.network` at the Vercel deployment.

Every PR gets a Preview URL — tap it on a real phone before merging to `main`
(production). Tip: give Preview its own Neon branch so test taps don't hit prod data.

---

## Security posture

**In place:** server-side validation (zod), rating 1–5 enforced in app **and** a DB
check constraint, honeypot + per-IP rate limit on the public endpoint, admin gate
(HTTP Basic over HTTPS), security headers, `robots: noindex`, least-PII storage,
oversized-body rejection, secrets only in env (never committed).

**Before heavy scale (tracked):**

- Rate limiter is in-memory (per instance). Swap for Upstash Redis for a hard global limit.
- Admin auth is a shared Basic credential. Upgrade to real sessions / SSO.
- Strict CSP is deferred (Next's inline bootstrap needs nonces to do it right).
- Flip on Cloudflare Turnstile if spam appears (wired, off by default).

---

## The future: card registry (designed for, not built yet)

v1 stores raw `e`/`b`/`c` on every row — fast, no lookups. The `submissions` table
already carries a nullable `campaign_id` so the next step is **additive, not a rewrite**:

- Add `campaigns` (brand, event, theme, active) and `cards` (opaque code → campaign).
- Cards then encode a short opaque code (`/c/7GkQ2`) resolved server-side, so a
  physical card can be **repointed / rebranded / retired** without rewriting NFC.
- Backfill `submissions.campaign_id` by matching existing `e`/`b`.

Keep the capture page fast by edge-caching each card's resolved config.

## Note on fonts

Body is **Geist**; the display face is **Space Grotesk** standing in for Satoshi
(self-hosted at build via `next/font`, no CDN — keeps page weight tiny). To use real
Satoshi, drop a subsetted `woff2` in and switch the display font to `next/font/local`.
