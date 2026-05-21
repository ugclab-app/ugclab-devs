# База данных на Windows (без Docker)

Docker **не обязателен**. Нужен только PostgreSQL и строка `DATABASE_URL` в `.env`.

## Вариант A — Neon (рекомендуется, ~5 минут, бесплатно)

1. Зарегистрируйтесь на [https://neon.tech](https://neon.tech)
2. Создайте проект → **PostgreSQL 16**
3. Скопируйте **Connection string** (режим *pooled* или *direct* — подойдёт оба)
4. В корне репозитория откройте `.env` и вставьте:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

5. В терминале из папки `ugclab-devs`:

```bash
npm run db:push
npm run db:seed
npm run verify:demo
npm run dev
```

6. Вход: http://localhost:3001/login — `demo@ugclab.store` / `demo1234`

---

## Вариант B — PostgreSQL на Windows (локально)

1. Скачайте установщик: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) (EDB installer)
2. Установите PostgreSQL 16, запомните пароль пользователя `postgres`
3. В **pgAdmin** или `psql` создайте базу:

```sql
CREATE DATABASE ugclab;
```

4. В `.env`:

```env
DATABASE_URL="postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/ugclab?schema=public"
```

5. Дальше те же команды:

```bash
npm run db:push
npm run db:seed
npm run dev
```

---

## Вариант C — Docker (если позже установите Docker Desktop)

```bash
docker compose up -d
npm run db:push
npm run db:seed
```

---

## Проверка

```bash
npm run verify:demo
```

Ожидается: `OK: demo@ugclab.store / demo1234 is valid`

Если ошибка «Can't reach database server» — неверный `DATABASE_URL` или БД не запущена.
