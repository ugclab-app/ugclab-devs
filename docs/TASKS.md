# UGCLab Store — backlog задач

Статусы: ✅ сделано · 🟡 частично · ⬜ в плане

## A. Инфраструктура

- ✅ Prisma generate на Windows (`npm run db:generate:safe`)
- ✅ E2E: login → product → checkout (`npm run e2e:checkout`)
- ⬜ CI: turbo lint + build
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

- 🟡 Единый UX страницы заказов (Order detail + AdminPageShell)
- ✅ Timeline + partial fulfill UI
- ✅ Shippo label panel в карточке заказа
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
- 🟡 Stripe Tax (Settings Tax tab + checkout; Dashboard enable still required)
- ✅ Platform MoR (default): checkout на platform Stripe, balance, payout requests
- ✅ MoR: refund через Stripe API + webhook `charge.refunded`
- ✅ MoR: partial refund по строкам заказа
- ✅ MoR: disputes webhook + счётчик в notifications
- ✅ MoR: sync from Stripe, mark paid fallback
- ✅ MoR: platform dashboard (debt, pending payouts, disputes)
- ✅ MoR: CSV export payouts; min payout + schedule (env)
- ✅ MoR: Stripe Tax + PayPal (theme toggles)
- ✅ Connect отключён в MoR (`/connect` → 400)
- ⬜ Wise auto-payout API
- ✅ MoR: payout status labels + merchant/platform emails
- ✅ Platform admin: «What to do today» action items

## J. Platform (super-admin)

- 🟡 MRR / GMV dashboards (+ action items MoR)
- ⬜ Модерация tenants
- ⬜ Custom domains + SSL

## K. Platform marketing site (:3000)

- 🟡 Landing + signup (:3000 page exists; OAuth TBD)
- ⬜ Тарифы, docs, status

---

После изменений схемы:

```bash
npm run db:push:force
npm run db:generate:safe
npm run dev:react
```
