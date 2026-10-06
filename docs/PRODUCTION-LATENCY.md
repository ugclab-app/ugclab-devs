# Быстрый ответ API / login / signup (без 30–60 с ожидания)

Задержка на проде почти всегда из **двух** мест:

1. **Neon** — compute «засыпает» после простоя (~5 мин на free).
2. **Vercel** — serverless-функция холодная (первый запрос после простоя).

Полностью «0 ms» на бесплатных тарифах нельзя, но можно довести типичный login/signup до **1–3 секунд**.

---

## 1. Neon: правильный `DATABASE_URL`

В Vercel → **ugclab-devs-api** → Environment Variables:

### Используйте **Pooled** connection string

В Neon Console: **Connect** → вкладка **Connection pooling** → скопируйте URI.

Хост обычно содержит `-pooler`, например:

```env
DATABASE_URL="postgresql://USER:PASS@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

**Не** используйте direct URL (`ep-xxxx.eu-central-1...` без `-pooler`) для Vercel — хуже для serverless и чаще таймауты.

### Миграции — отдельно (локально / CI)

Для `prisma migrate` иногда нужен direct URL. Локально в `.env`:

```env
# Только для migrate (опционально)
# DIRECT_URL="postgresql://...@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

На runtime в Vercel остаётся только **pooler** `DATABASE_URL`.

### Меньше «сна» базы (Neon Console)

**Project → Settings → Compute**

- Увеличьте **Suspend compute after inactivity** (на paid — или отключите suspend).
- На **Free** suspend ~5 мин не отключается — тогда обязателен **прогрев** (п. 3).

---

## 2. Vercel: переменные и проекты

### API (`ugclab-devs-api`, tescommerce.com)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Neon **pooler** (см. выше) |
| `AUTH_SECRET` | секрет |
| `SESSION_COOKIE_DOMAIN` | `.tescommerce.com` |
| `MERCHANT_ADMIN_URL` | `https://admin.tescommerce.com` |
| `CRON_SECRET` | случайная строка (для cron warm-up) |

### Merchant admin (`admin.tescommerce.com`)

| Переменная | Значение |
|------------|----------|
| `VITE_API_URL` | `https://tescommerce.com/api` |

Прямой вызов API быстрее, чем proxy `/api` → tescommerce.com.

---

## 3. Прогрев (keep-warm)

В репозитории есть эндпоинт:

```http
GET https://tescommerce.com/api/health/ready
```

Он поднимает **функцию Vercel** и делает `SELECT 1` в БД.

### Vercel Cron (только Pro)

На **Hobby** в `vercel.json` нельзя ставить cron чаще **1 раза в сутки** — деплой упадёт. Cron в репозитории **не включён**; используйте внешний ping ниже.

На **Pro** можно добавить в `apps/api/vercel.json`:

```json
"crons": [{ "path": "/api/health/ready", "schedule": "*/5 * * * *" }]
```

Задайте `CRON_SECRET` в Vercel — платформа шлёт `Authorization: Bearer …`.

### Прогрев на Hobby — внешний cron (рекомендуется)

Например [cron-job.org](https://cron-job.org):

- URL: `https://tescommerce.com/api/health/ready`
- Интервал: **5 минут**
- Header: `Authorization: Bearer <ваш CRON_SECRET>`

Так Neon и Vercel реже «просыпаются» с нуля.

---

## 4. Платные опции (если нужен почти мгновенный ответ)

| Что | Эффект |
|-----|--------|
| **Neon** без suspend / больший compute | БД не засыпает |
| **Vercel Pro** + cron каждые 1–5 мин | Функция тёплая |
| **Vercel** Fluid Compute / больше memory | Быстрее cold start |
| **Prisma Accelerate** | Connection pool + кэш запросов (платно) |

---

## 5. Проверка

1. После 10+ минут простоя откройте:  
   `https://tescommerce.com/api/health/ready`  
   - `{"ok":true,"db":true,"ms":...}` — норма.  
   - `503` / долго — проверьте `DATABASE_URL` (pooler).

2. Сразу после этого — login на [admin.tescommerce.com/login](https://admin.tescommerce.com/login).

3. DevTools → **Network** → `login` — ожидайте **&lt; 5 s**, не 60 s.

---

## 6. Что уже сделано в коде

- Prisma client **переиспользуется** между вызовами serverless (`packages/database`).
- Login/signup: проверка БД с таймаутом (ошибка 503 вместо вечного «Signing in…»).
- Merchant admin: прямой `VITE_API_URL`, таймаут fetch 45 s.

Итог: **pooler URL + CRON_SECRET + прогрев каждые 5 мин** — главный практический шаг без смены архитектуры.
