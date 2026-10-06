# Supabase + Vercel (если `/api/health/ready` → 504)

Локально БД работает, на **tescommerce.com** — таймаут: чаще всего **регион Vercel** (по умолчанию `iad1`, США) и БД во **Frankfurt**. В `apps/api/vercel.json` задано `"regions": ["fra1"]` — после деплоя функции выполняются рядом с Supabase.

Если 504 остаётся — настройки в **Supabase Dashboard** (ниже).

## Чеклист в Supabase

1. **Project Settings → Database →image.png**  
   Отключите ограничения или разрешите доступ **со всех IP** (Vercel не даёт фиксированный egress IP на Hobby).

2. **Connect → ORM → Prisma → Transaction mode**  
   Скопируйте URI (порт **6543**). Должен совпадать с корневым `.env` (`postgres.PROJECT_REF@aws-…pooler.supabase.com:6543`).

3. **Database password** — после сброса обновите `.env` и выполните:
   ```bash
   npm run vercel:database-url
   npm run deploy:api
   npm run supabase:verify:prod
   ```

4. [Vercel ↔ Supabase Integration](https://vercel.com/integrations/supabase): **Tescommerce** → **ugclab-devs-api** → **Connect project**. Появятся `POSTGRES_PRISMA_URL` и др.; API **предпочитает** их, а не старый `DATABASE_URL`. Удалите вручную устаревший `DATABASE_URL` в Vercel (Settings → Environment Variables), если он остался. **Redeploy** обязателен.

5. Если **логин на admin** даёт **504** — Vercel не достучится до Supabase по TCP. **Решение без Pro ($25):** [Prisma Accelerate](PRISMA-ACCELERATE.md) (бесплатный tier, HTTP).

6. IPv4 add-on (~$4) только на **платном** Supabase (Pro+); для pooler `:6543` обычно не нужен.

5. Если используете **прямой** хост `db.*.supabase.co` (не pooler) — на Vercel нужен **IPv4 add-on** в Supabase (~$4/мес).

## Проверка

```bash
npm run supabase:verify:prod
```

Ожидается: `prod 200` и `"db":true`.
