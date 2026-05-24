# Deploy API to Vercel

## Project settings

In the Vercel dashboard for **ugclab-devs-api**, set:

- **Root Directory:** `apps/api`
- **Framework Preset:** Other
- **Node.js:** 20.x

## What is deployed on tescommerce.com

- **Landing** (Vite `apps/platform`) → `apps/api/public` at build; served by `landing-app.ts` via `api/index.ts` (no Prisma on `/`, `/assets/*`)
- **Do not** add `src/app.ts` or `src/index.ts` — Vercel treats them as extra Hono entrypoints and returns 500
- **API** (Hono) → `/api/*`; `/health` → edge `api/health.ts`
- **Not included:** merchant admin (`3001`) and storefront (`3002`) — deploy separately or use subdomains

## Environment variables

Add at least:

- `DATABASE_URL` — Postgres connection string (required; without it API routes time out)
- `AUTH_SECRET` — JWT signing secret
- `MERCHANT_ADMIN_URL` — merchant admin URL (CORS + signup redirect)
- `PLATFORM_URL` — `https://tescommerce.com`
- `PLATFORM_ADMIN_URL` — platform admin URL (CORS)
- `STOREFRONT_URL` — storefront origin (CORS)
- `VITE_MERCHANT_ADMIN_URL` — same as `MERCHANT_ADMIN_URL` (used when building landing)
- Stripe keys if billing is used

## Deploy from CLI

From the **monorepo root** (Vercel **Root Directory** must be `apps/api`):

```bash
cd path/to/ugclab-devs
npx vercel link --yes --scope ecommerce-mus --project ugclab-devs-api
npm run deploy:api
```

Do **not** run `vercel` from inside `apps/api` — the dashboard root path would double to `apps/api/apps/api`.

Do **not** upload a local `apps/api/public/` folder (stale Vite hashes break the build). `.vercelignore` excludes it; the build recreates `public/` on Vercel.

Workspace packages (`@ugclab/database`, `@ugclab/tenant`, `@ugclab/i18n`) compile to `dist/` during build — required for Vercel runtime.

## Build

Production build runs only `@ugclab/api` and `@ugclab/database` (Prisma generate + `tsc --noEmit`). The serverless entry is `api/index.ts` (Hono `handle`).
