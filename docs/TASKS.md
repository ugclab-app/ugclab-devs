# UGCLab Store — backlog задач

Статусы: ✅ сделано · 🟡 частично · ⬜ в плане

## A. Инфраструктура

- ✅ Prisma generate на Windows (`npm run db:generate:safe`)
- ⬜ E2E: login → product → checkout
- ⬜ CI: turbo lint + build
- ⬜ Убрать дубль `merchant-admin` vs `merchant-web` (один dev-порт)
- ⬜ Обновить README (фазы 0–1)

## B. Merchant Admin — общий UX

- 🟡 Единый layout (`AdminPageShell`, breadcrumbs, max-w-6xl) — Products, Payments, Abandoned carts, Dashboard
- ⬜ i18n EN/RU (отложено)
- ⬜ Тёмная тема (отложено)
- ⬜ Адаптив: мобильное меню (отложено)
- ✅ Центр уведомлений (orders, low stock, payments)
- ✅ Онбординг wizard (Stripe → product → storefront → test)
- ✅ Страница **Payments** (`/payments`: Connect + Billing + Payouts)
- ✅ Command palette **⌘P** (навигация по разделам)
- ⬜ Применить `AdminPageShell` на Orders, Customers, Settings, Marketing, Collections

## C. Товары

- ✅ Двухколоночная форма (media, rich text, slug, SEO, collections, SKU, sticky bar)
- ✅ Scheduled publish (`publishAt` + cron)
- ✅ Cost per item (`costAmountCents`)
- ⬜ Product bundles / frequently bought together
- ⬜ CSV import: preview ошибок + mapping колонок
- ⬜ Digital subscriptions (recurring)
- ⬜ Geo-prices
- ✅ Bulk: delete, add to collection (+ publish/archive)
- ✅ Пагинация списка товаров
- ✅ Storefront SEO из `translations._seo`

## D. Заказы

- ⬜ Единый UX страницы заказов
- ⬜ Timeline + partial fulfill UI
- ⬜ Shippo label в карточке заказа
- ⬜ Bulk fulfill, фильтр по стране

## E. Коллекции, скидки, черновики

- ⬜ Collections: UX как Products, drag-sort
- ⬜ Discounts / Promotions: визуальный редактор правил
- ⬜ Draft orders: быстрый ручной заказ
- 🟡 Abandoned carts: метрики + кнопка recovery campaign

## F. Витрина (merchant)

- 🟡 Live preview (компонент `StorefrontPreview` на Storefront page)
- 🟡 Block editor home (`SiteBuilder`)
- ⬜ Collection hero / announcement editor
- ⬜ Mobile preview toggle

## G. Marketing (Email)

- ✅ Campaigns v2 (schedule, A/B, templates, tracking, automations, subscribers)
- 🟡 UI: open/click % в списке кампаний
- ⬜ A/B report: победитель
- ⬜ Visual template editor
- 🟡 Abandoned cart campaign из UI (ссылка на Marketing)

## H. Storefront (покупатель)

- ✅ Product page SEO meta
- ⬜ Checkout UX
- ⬜ Account: PDF invoices, reorder
- ⬜ Каталог: фильтры, сортировка

## I. Платежи

- ✅ Stripe Connect + Link + platform billing (API)
- ✅ Payments hub в админке
- ⬜ PayPal / local methods
- ⬜ Stripe Tax
- ⬜ Platform MoR

## J. Platform (super-admin)

- ⬜ MRR / GMV dashboards
- ⬜ Модерация tenants
- ⬜ Custom domains + SSL

## K. Platform marketing site (:3000)

- ⬜ Landing + signup OAuth
- ⬜ Тарифы, docs, status

---

После изменений схемы:

```bash
npm run db:push:force
npm run db:generate:safe
npm run dev:react
```
