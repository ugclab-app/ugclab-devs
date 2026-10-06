# Prisma Accelerate + Supabase (fix 504 on Vercel)

If **admin.tescommerce.com** login returns **504**, but `npm run verify:demo` works locally, Vercel cannot open a TCP connection to Supabase pooler. **Prisma Accelerate** routes queries over **HTTP** (free tier ~100k ops/month).

## Setup (once)

1. [console.prisma.io](https://console.prisma.io) → sign up → new project.
2. **Enable Accelerate** → paste your Supabase **Transaction** URI (`:6543`, from Connect → Prisma).
3. Region: **EU** (close to Frankfurt).
4. **Generate API key** → copy `prisma://accelerate.prisma-data.net/?api_key=...`

## `.env` (repo root)

```env
# Queries (local + Vercel) — Accelerate
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"

# Migrations / db:push only — direct Supabase pooler
DIRECT_URL="postgresql://postgres.eugsusbifqewtyfnnsjc:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

Keep `DIRECT_URL` as normal Postgres URL (not `prisma://`).

**Local Node:** the API uses `DIRECT_URL` (TCP). `npm run db:generate` / `db:push` always regenerate the client from `DIRECT_URL` so the query engine is included — otherwise you get `P6001` (URL must be `prisma://`) after a push against Accelerate.

**Vercel:** uses Accelerate (`DATABASE_URL` with `prisma://`).

## Vercel

1. **Environment Variables** → set `DATABASE_URL` = Accelerate `prisma://...` (Sensitive).
2. Or: `npm run vercel:database-url` after updating root `.env`.
3. **Redeploy** `ugclab-devs-api`.

`POSTGRES_PRISMA_URL` from Supabase integration is ignored when `DATABASE_URL` is already `prisma://`.

## Verify

```bash
npm run verify:demo
npm run deploy:api
npm run supabase:verify:prod
```

Login: https://admin.tescommerce.com/login

## Cost

- Accelerate: **free tier** (limited ops/month).
- Supabase: stay on **Free** — no Pro ($25) required for this fix.
