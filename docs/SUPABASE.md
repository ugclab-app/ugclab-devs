# Supabase (PostgreSQL) для Tescommerce

Prisma работает с Supabase как с обычным Postgres. Для **Vercel** нужен **pooler** (порт **6543**), для **миграций** — **direct** (порт **5432**).

---

## 1. Supabase Dashboard

1. [supabase.com/dashboard](https://supabase.com/dashboard) → ваш проект (например `eucbbatoqbetgnywgeuh`).
2. **Project Settings → Database** → задайте или сбросьте **Database password** (сохраните).
3. **Connect → ORM → Prisma** — скопируйте обе строки, или соберите вручную:

**Runtime (Vercel, `DATABASE_URL`)** — Transaction mode, порт **6543**:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

**Миграции (`DIRECT_URL`)** — Session / direct, порт **5432**:

```env
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

Замените `PROJECT_REF`, `PASSWORD` и регион (`ap-southeast-2` для Sydney) на значения из Dashboard.

**Пароль со спецсимволами** (`?`, `$`, `#`, `@`, `+` и т.д.) нужно [URL-encode](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) в строке подключения, иначе Prisma: `invalid port number`. Проще: в Supabase задать пароль только из букв и цифр.

> На Vercel — **только** `DATABASE_URL` (pooler :6543). `DIRECT_URL` на Vercel **не** ставить (`npm run vercel:database-url` удалит его). Локально `DIRECT_URL` — для `db:push` / `db:migrate`.

---

## 2. Локальный `.env`

В корне репозитория (`ugclab-devs/.env`):

```env
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

---

## 3. Создать таблицы и seed

Из корня репозитория:

```bash
npm run db:push -w @ugclab/database
npm run db:seed -w @ugclab/database
npm run verify:demo
```

> На **пустой** базе используйте `db:push` (в репозитории нет baseline-миграции с CREATE TABLE). `db:deploy` — только если `_prisma_migrations` уже в порядке.

Ожидается: `OK: demo@ugclab.store / demo1234 is valid`

---

## 4. Скрипты в репозитории

```bash
npm run supabase:sync-env    # root .env → merchant-admin / merchant-web .env.local
npm run supabase:verify      # локальное подключение к pooler
npm run vercel:database-url  # DATABASE_URL на Vercel (production + preview), убрать DIRECT_URL
npm run deploy:api
npm run supabase:verify:prod # health/ready на tescommerce.com
npm run verify:demo
```

---

## 5. Vercel (`ugclab-devs-api`)

### Если в Dashboard «исчезает» DATABASE_URL

Sensitive-переменные **не показывают** значение при редактировании — поле пустое. **Save с пустым полем = удаление.**

**Надёжно через CLI** (из корня, `.env` уже с `DATABASE_URL`):

```bash
npm run vercel:database-url
npm run deploy:api
```

Или: **Environment Variables → Import .env** — одна строка `DATABASE_URL=...`.

Или **Supabase Integration**: [vercel.com/integrations/supabase](https://vercel.com/integrations/supabase) — pooler URL подставится сам. Отключите **Neon Integration**.

1. **Integrations → Neon** — отключить (если была).
2. `DATABASE_URL` = pooler (6543, `pgbouncer=true`), **Production + Preview + Sensitive**.
3. **Redeploy** (без redeploy env не применится).

> `DIRECT_URL` на Vercel **не** нужен.

Проверка:

```bash
npm run supabase:verify:prod
# или https://tescommerce.com/api/health/ready → {"ok":true,"db":true}
```

Если **504** на проде — [SUPABASE-PRODUCTION.md](SUPABASE-PRODUCTION.md) (Network restrictions в Dashboard).

---

Если прод отдаёт **504/503** на health — [docs/SUPABASE-PRODUCTION.md](SUPABASE-PRODUCTION.md).

---

## 6. Перенос данных с Neon (опционально)

Если в Neon (проект `icy-credit`) есть нужные данные:

```bash
# Neon direct URL → dump
pg_dump "postgresql://..." > backup.sql

# Supabase direct URL → restore
psql "postgresql://...DIRECT_URL..." < backup.sql
```

Для пустого старта достаточно `db:deploy` + `db:seed`.

---

## 6. Скорость (важно)

### Локально (`npm run dev`) — порт **5432**, не 6543

| URL | Когда |
|-----|--------|
| `:5432` session pooler | **localhost** — API работает постоянно, быстрее |
| `:6543` + `pgbouncer=true` | **Vercel** serverless — только на проде |

В `.env` для dev:

```env
DATABASE_URL="postgresql://postgres.REF:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres"
DIRECT_URL="..."   # тот же хост :5432
```

На Vercel оставьте **6543** + `pgbouncer=true`.

### Регион

Проект в **Sydney** — из Кырgyzstan/Европы каждый запрос +300–500 ms RTT. Dashboard делает **4+ запроса** к БД → ощущается как «вечная загрузка».

**Рекомендация:** новый Supabase-проект в **EU West (Frankfurt)** или **US East** → `db:push` + `db:seed` → обновить `.env` и Vercel. Ближе и к вам, и к Vercel (fra1).

### Free tier

Supabase Free **засыпает** после ~7 дней без запросов; первый запрос после сна — **5–20 с**. Pro / регулярный ping убирает паузу.

### Альтернатива для dev

Локальный Postgres (`docker compose up -d`) — мгновенно; Supabase только на проде.

---

## Troubleshooting

| Симптом | Решение |
|--------|---------|
| 504 / timeout на login | Неверный `DATABASE_URL` на Vercel; нужен pooler `:6543` |
| `prepared statement already exists` | В URL нет `?pgbouncer=true` |
| migrate fails | Используйте `DIRECT_URL` (5432), не pooler 6543 |
| Save в Vercel стирает URL | Не Save с пустым поле; добавьте переменную заново |
