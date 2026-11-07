# UGCLab Store — backlog задач

Статусы: ✅ сделано · 🟡 частично · ⬜ в плане

## A. Инфраструктура

- ✅ Prisma generate на Windows (`npm run db:generate:safe`)
- ✅ E2E: login → product → checkout (`npm run e2e:checkout`)
- ✅ CI: GitHub Actions — API lint + unit tests (`.github/workflows/ci.yml`)
- ✅ Rate limit: login / forgot-password / magic-link / reset-password / merchant-api-v1
- ✅ Product feeds: Google Merchant XML + Meta/TikTok CSV (`/api/store/feeds/…`, Growth toggle)
- ✅ OpenAPI: `GET /api/v1/openapi.json`
- ✅ Merchant webhooks: SSRF-guard (https, no private IP / DNS rebinding), delivery log, retries 1m→12h (cron), redeliver from admin
- ✅ Cloudflare Turnstile: merchant login/signup/forgot/magic-link (`TURNSTILE_*` env) + storefront checkout/login (per-store keys in Growth → Checkout options)
- ✅ GDPR: customer export JSON + erase (anonymize) in Customer detail — orders kept, PII blanked
- ✅ Unit tests: checkout totals / credits / refund math, invoice numbers, forecast, recommendations, URL guard (`order-math.test.ts`)
- ✅ Durable job queue (`BackgroundJob` outbox) for emails + Vercel Cron `/api/cron` every 5m
- ✅ Platform + product-sub dunning emails; cancel survey + stay offer on billing
- ✅ Store SEO audit score (Growth → SEO hub)
- ✅ Platform merchant profitability report (Revenue)
- ✅ AI product describe/translate (`OPENAI_API_KEY`)
- ✅ Zapier/Make via expanded webhooks + `docs/ZAPIER-MAKE.md`
- ✅ Money path: payment → refund → balance → payout + MoR risk unit tests (`money-path.test.ts`)
- ✅ Vitest для API (`vitest run`, auto-discover `*.test.ts`, coverage script)
- ✅ Sentry: `@sentry/node` (API `SENTRY_DSN`) + `@sentry/react` (storefront/merchant `VITE_SENTRY_DSN`)
- ✅ Biome lint (`npm run lint:biome`) — CI soft-fail пока чистим долг
- ✅ Playwright smoke checkout (`npm run e2e:smoke`, API request-level)
- ✅ UX/a11y: skill `ux-a11y-storefront`, WCAG `--store-on-primary`, focus-visible, form `role="alert"`
- ✅ Taste: `design-taste-frontend` (project) + rule только landing/темы
- ⬜ Убрать дубль `merchant-admin` vs `merchant-web` (один dev-порт)
- ⬜ Обновить README (фазы 0–1)

## B. Merchant Admin — общий UX

- 🟡 Единый layout (`AdminPageShell`, breadcrumbs, max-w-6xl) — Products, Payments, Abandoned carts, Dashboard
- 🟡 i18n EN/RU (Settings language + ru.json; full admin TBD)
- ⬜ Тёмная тема (отложено)
- ⬜ Адаптив: мобильное меню (отложено)
- ✅ Центр уведомлений (orders, low stock, payments)
- ✅ Онбординг wizard (Stripe → product → storefront → test)
- ✅ Страница **Payments** (`/payments`: Connect + Billing + Payouts)
- ✅ Command palette **⌘P** (навигация по разделам)
- 🟡 Применить `AdminPageShell` на Orders, Customers, Settings (+ Order detail), Marketing, Collections
- ✅ Bulk edit spreadsheet (`/products/bulk-edit`, `POST /products/bulk-patch`)
- ✅ Soft-delete trash 30d + restore (`deletedAt`, cron purge)
- ✅ Product revisions + rollback on PATCH
- ✅ Saved filters (orders/products)
- ✅ Customer internal notes + timeline; merge duplicates API
- ✅ Guest order → customer convert
- ✅ How-heard post-purchase survey + `/analytics/how-heard`
- ✅ Scheduled price change; min/max qty; batch one-time discount codes; FX rounding

## C. Товары

- ✅ Двухколоночная форма (media, rich text, slug, SEO, collections, SKU, sticky bar)
- ✅ Scheduled publish (`publishAt` + cron)
- ✅ Cost per item (`costAmountCents`)
- ✅ Recommendations: «You may also like» (collections/tags/type/price) + «Frequently bought together» (co-purchases) — `GET /store/products/:slug/recommendations`
- ✅ Stock forecast: «runs out in N days» + suggested reorder (Inventory → Stock forecast, `GET /merchant/inventory/forecast`)
- ✅ CSV import: preview + mapping колонок
- ✅ Digital license keys (pool on product → assign on fulfill)
- ✅ Loyalty points (earn/redeem)
- ✅ SMS/WhatsApp via Twilio (Growth → Integrations)
- ✅ Visual email blocks builder (Marketing)
- ✅ Wise auto-transfer hook on payout mark-paid
- ✅ Mobile admin drawer nav
- ✅ Store migration: Shopify / WooCommerce / Etsy CSV (products+variants+images, customers, orders) — `POST /merchant/import/store`
- ✅ Courses / gated content: lessons (text + embedded video) on digital products → storefront `/library`
- ✅ Pay what you want + minimum price
- ⬜ Digital subscriptions (recurring)
- ⬜ Geo-prices
- ✅ Bulk: delete, add to collection (+ publish/archive)
- ✅ Пагинация списка товаров
- ✅ Storefront SEO из `translations._seo`

## D. Заказы

- 🟡 Единый UX страницы заказов (Order detail + AdminPageShell)
- ✅ Timeline + partial fulfill UI
- ✅ Shippo label panel в карточке заказа
- ✅ Invoice numbering: prefix + sequential counter (Growth → Checkout options), assigned on paid; shown on invoice PDF/HTML and searchable
- 🟡 Bulk fulfill; фильтр по стране; колонки Date / Items / Ship to / Tracking / MoR net

## E. Коллекции, скидки, черновики

- ⬜ Collections: UX как Products, drag-sort
- ⬜ Discounts / Promotions: визуальный редактор правил
- ⬜ Draft orders: быстрый ручной заказ
- ✅ Abandoned carts: recovery email из UI + campaign link

## F. Витрина (merchant)

- 🟡 Live preview (компонент `StorefrontPreview` на Storefront page)
- 🟡 Block editor home (`SiteBuilder`)
- ⬜ Collection hero / announcement editor
- 🟡 **Themes (block presets)**: gallery, mobile/tablet preview, custom CSS, save custom presets — **не** Shopify Liquid
- ✅ Mobile preview toggle (Site Builder viewport)

## F2. Markets & Taxes

- ✅ `localeCurrencies` + `markets` на `StoreSettings` (display FX + country tax)
- ✅ Checkout tax by shipping country (`resolveTaxRateBps`)
- ✅ Settings tabs Markets / Tax; `stripeTaxEnabled` SOT + sync в theme
- 📄 `docs/MARKETS-TAX.md`

## G. Marketing (Email)

- ✅ Campaigns v2 (schedule, A/B, templates, tracking, automations, subscribers)
- 🟡 UI: open/click % в списке кампаний
- ⬜ A/B report: победитель
- ⬜ Visual template editor
- 🟡 Abandoned cart campaign из UI (ссылка на Marketing)

## H. Storefront (покупатель)

Уже есть: SEO товара, checkout (шаги, скидка, подарочная карта, доставка, самовывоз), PDF-чек, повтор заказа, трек-номер, отзывы, Q&A, блог, возврат, избранное в браузере, поиск с подсказками, переключатель языка. Сортировка и фильтр type/tag — только на главной.

Конверсия (58–65, 70):
- ✅ Guest track без логина (`/track`, `POST /orders/track` по номеру + email)
- ✅ Delivery ETA на PDP и карточке товара
- ✅ Zoom / lightbox галереи
- ✅ «Just bought» social proof toast (`GET …/recent-purchases`)
- ✅ UGC фото из отзывов на PDP
- ✅ Карта ПВЗ на checkout (Google Maps embed по адресу склада)

Дальше, по порядку:

1. ✅ Кабинет: регистрация, сброс пароля, профиль, сохранённые адреса
2. ✅ Избранное в аккаунте (гость — `localStorage`, после входа синхронизируется)
3. ✅ Коллекции: сортировка, фильтр по цене и наличию, пагинация
4. ✅ Страница результатов поиска `/search`
5. ✅ Карточка товара: количество, цена и остаток варианта, свотчи цвет/размер
6. ✅ «Сообщить, когда появится» и таблица размеров (поле Size chart в товаре)
7. ✅ Переключатель валюты рядом с языком (базовая + рынки + локали)
8. ✅ Мобильное меню в шапке
9. ✅ Страница заказа: ссылка на перевозчика и история статусов

## I. Платежи

- ✅ Stripe Connect + Link + platform billing (API) — Connect опционален (`PAYMENT_MODEL=connect`)
- ✅ Payments hub в админке
- ⬜ PayPal / local methods
- ✅ BNPL (Klarna / Afterpay / Affirm) via Stripe — Growth → Checkout options; auto by currency
- ✅ Store credit: balance on customer, refund-to-credit, apply at checkout
- ✅ Tips at checkout (percent presets / custom)
- ✅ Custom checkout fields (delivery date, VAT/INN, comment…)
- ✅ Blocked countries (no checkout)
- 🟡 Stripe Tax (Settings Tax tab + checkout; Dashboard enable still required)
- ✅ Platform MoR (default): checkout на platform Stripe, balance, payout requests
- ✅ MoR: refund через Stripe API + webhook `charge.refunded`
- ✅ MoR: partial refund по строкам заказа
- ✅ MoR: disputes webhook + счётчик в notifications
- ✅ MoR risk: first-payout hold, new-shop GMV cap, dispute auto-freeze, Terms prohibited list
- ✅ MoR: sync from Stripe, mark paid fallback
- ✅ MoR: platform dashboard (debt, pending payouts, disputes)
- ✅ MoR: CSV export payouts; min payout + schedule (env)
- ✅ MoR: Stripe Tax + PayPal (theme toggles)
- ✅ Connect отключён в MoR (`/connect` → 400)
- ✅ Wise auto-payout API (optional on mark-paid)
- ✅ MoR: payout status labels + merchant/platform emails
- ✅ Platform admin: «What to do today» action items

## J. Platform (super-admin)

- 🟡 MRR / GMV dashboards (+ action items MoR)
- ⬜ Модерация tenants
- ⬜ Custom domains + SSL

## K. Platform marketing site (:3000)

- 🟡 Landing + signup (:3000 page exists; OAuth TBD)
- ✅ `/pricing`, `/tools/savings`, guides, glossary (en/ru/tr)
- ✅ Expanded `/vs/*` + `/sell-from/*` SEO pages + sitemap/prerender
- 🟡 Status page exists; full docs hub still light

---

После изменений схемы:

```bash
npm run db:push:force
npm run db:generate:safe
npm run dev:react
```
