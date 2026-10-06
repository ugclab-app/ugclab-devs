# Affiliate / Creator referral program (design)

Мерчант приглашает креаторов, выдаёт персональную ссылку. Покупки атрибутируются креатору; комиссия считается от **чистой выручки мерчанта** (после комиссии платформы MoR).

**Выплаты креаторам в v1 — только силами мерчанта** (PayPal, Wise, банк, crypto и т.д.). UGCLab не переводит деньги креаторам, не хранит их баланс и не подключает Stripe Connect для affiliate. В админке — учёт «сколько должны» и кнопка **Mark as paid** после того, как мерчант уже перевёл креатору сам.

Совместимо с `PAYMENT_MODEL=mor` (по умолчанию) и `connect`.

---

## Выплаты креаторам (v1) — off-platform

| Платформа делает | Платформа не делает |
|------------------|---------------------|
| Считает комиссию по заказам | Переводы креаторам |
| Показывает «Owed to creators» / по партнёру | `AffiliatePayout`, Wise API, Connect account креатора |
| **Mark as paid** + опционально `payoutNote` («PayPal 12.03») | Удержание денег креатора на балансе UGCLab |
| CSV для бухгалтерии мерчанта | Email креатору «вам начислено» (опционально позже) |

**Смысл статуса `PAID`:** мерчант зафиксировал, что **уже** заплатил креатору вне платформы. Это не триггер выплаты.

**MoR-баланс мерчанта** (запрос payout на платформу): из `available` вычитаем сумму комиссий в статусе `APPROVED` (долг перед креаторами). После `PAID` долг списывается из «owed», доступный баланс для вывода с платформы растёт — мерчант не должен запрашивать payout, пока не разобрался с креаторами (рекомендация в UI, не блокировка API в v1).

---

## Цели MVP (фаза 1)

| Есть | Нет (позже) |
|------|-------------|
| CRUD партнёров (креаторов) в merchant admin | Отдельный портал креатора с логином |
| Уникальная ссылка `?ref=CODE` + cookie 30 дней | Любые выплаты через UGCLab |
| Атрибуция на заказе при checkout | Stripe Connect / Wise для креаторов |
| Комиссия % от merchant net | A/B ссылок, deep product-only links |
| Учёт долга + **Mark as paid** (бухгалтерия) | Автоматический payout |
| Статусы: approved → paid / void | Публичный leaderboard на витрине |

---

## Деньги (MoR)

```
buyer pays          = order.totalAmount
platform fee        = order.platformFeeAmount
merchant gross net  = totalAmount - platformFeeAmount   // как сейчас в merchant-balance.ts
affiliate commission = round(merchantNet * commissionBps / 10000)
merchant keeps      = merchantNet - affiliateCommission
```

Комиссия креатора **не** берётся с комиссии платформы — только с доли мерчанта. Иначе платформа субсидирует affiliate.

**Баланс мерчанта** (`getMerchantBalance`):

```ts
earnedCents = sum(merchantNet) на PAID/FULFILLED заказах
owedToCreatorsCents = sum(commissionCents where status === APPROVED)
availableCents = earnedCents - paidOutPlatform - pendingPlatformPayouts - owedToCreatorsCents
```

Комиссии со статусом `PAID` в `owed` не входят (мерчант уже отметил внешнюю выплату). При **refund** → `VOID`, сумма уходит из owed автоматически.

В v1 при оплате заказа комиссия сразу `APPROVED` (без hold), clawback при refund.

---

## Prisma (новые модели)

```prisma
enum AffiliatePartnerStatus {
  ACTIVE
  PAUSED
}

enum AffiliateCommissionStatus {
  APPROVED   // долг перед креатором (мерчант платит сам)
  PAID       // мерчант отметил: уже заплатил креатору off-platform
  VOID       // refund / dispute / отмена
}
// PENDING — только при dispute hold (опционально)

model AffiliateProgramSettings {
  tenantId              String   @id
  enabled               Boolean  @default(false)
  defaultCommissionBps  Int      @default(1000)  // 10%
  cookieDays            Int      @default(30)
  attributionModel      String   @default("last_click") // last_click only in v1
  updatedAt             DateTime @updatedAt @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model AffiliatePartner {
  id              String                 @id @default(cuid())
  tenantId        String
  code            String                 // URL-safe, unique per tenant, e.g. "anna20"
  displayName     String
  email           String?
  commissionBps   Int?                   // override; null = program default
  status          AffiliatePartnerStatus @default(ACTIVE)
  note            String?                @db.Text
  createdAt       DateTime               @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime               @updatedAt @db.Timestamptz(6)

  tenant       Tenant                @relation(...)
  commissions  AffiliateCommission[]
  clicks       AffiliateClick[]      // optional v1.1

  @@unique([tenantId, code])
  @@index([tenantId, status])
}

model AffiliateCommission {
  id                 String                    @id @default(cuid())
  tenantId           String
  partnerId          String
  orderId            String                    @unique
  orderTotalCents    Int
  merchantNetCents   Int
  commissionBps      Int
  commissionCents    Int
  status             AffiliateCommissionStatus @default(PENDING)
  paidAt             DateTime?                 @db.Timestamptz(6)
  payoutNote         String?                   @db.Text  // «PayPal @anna, 2026-03-12» — только заметка мерчанта
  createdAt          DateTime                  @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime                  @updatedAt @db.Timestamptz(6)

  tenant  Tenant           @relation(...)
  partner AffiliatePartner @relation(...)
  order   Order            @relation(...)

  @@index([tenantId, status])
  @@index([partnerId, status])
}

// v1.1 — аналитика кликов
model AffiliateClick {
  id         String   @id @default(cuid())
  tenantId   String
  partnerId  String
  landingPath String?
  createdAt  DateTime @default(now()) @db.Timestamptz(6)

  partner AffiliatePartner @relation(...)
  @@index([tenantId, partnerId, createdAt])
}
```

**Изменения в `Order`:**

```prisma
  affiliatePartnerId   String?
  affiliateCommissionCents Int @default(0)

  affiliatePartner AffiliatePartner? @relation(...)
```

При создании заказа (ещё `PENDING`) заполняем `affiliatePartnerId` из cookie/`ref`. После `fulfillPaidOrder` создаём `AffiliateCommission`.

---

## Атрибуция (storefront)

1. Покупатель переходит: `https://{store}/?ref=anna20` (или `&ref=` на любой странице).
2. Storefront API (публичный): `POST /api/store/:tenant/affiliate/attribution` с `{ code }` → validates partner → sets HttpOnly cookie `ugclab_ref_{tenantSlug}` = code, `Max-Age = cookieDays * 86400`, `SameSite=Lax`, `Path=/`.
3. При `place-order` / `prepareOrder`: читать cookie (или `body.affiliateCode`), resolve `AffiliatePartner` если program enabled + ACTIVE.
4. Сохранить `affiliatePartnerId` на `Order` до Stripe Checkout.

**Правила:**

- `last_click`: новый `?ref=` перезаписывает cookie.
- Не атрибутировать self-referral: если `customer.email === partner.email` → skip (MVP).
- Пауза партнёра: cookie ставится, но новые заказы не атрибутируются.

Опционально связать партнёра с `DiscountCode` (поле `affiliatePartnerId` на скидке) — один код и для скидки, и для атрибуции. **Не обязательно в v1.**

---

## Расчёт комиссии (при оплате)

В `fulfillPaidOrder` после обновления `platformFeeAmount`:

```ts
if (order.affiliatePartnerId) {
  const partner = await loadPartner(...)
  const bps = partner.commissionBps ?? settings.defaultCommissionBps
  const merchantNet = merchantNetFromOrder(order.totalAmount, order.platformFeeAmount)
  const commissionCents = Math.floor((merchantNet * bps) / 10000)
  await tx.affiliateCommission.upsert({
    where: { orderId: order.id },
    create: { ..., status: "APPROVED", commissionCents },
    update: {},
  })
  await tx.order.update({ affiliateCommissionCents: commissionCents })
}
```

**Refund:** в обработчике `charge.refunded` / partial refund — пропорционально уменьшить `commissionCents` или `status = VOID` при full refund.

**Dispute:** при `charge.dispute.created` → `PENDING` hold; при проигрыше dispute → `VOID`.

---

## API (merchant)

Префикс: `/merchant/affiliates` (новый `merchant-p16.ts` или таб в `merchant-growth`).

| Method | Path | Описание |
|--------|------|----------|
| GET | `/settings` | program enabled, default %, cookie days |
| PATCH | `/settings` | owner only |
| GET | `/partners` | list + stats (orders, commission sum) |
| POST | `/partners` | `{ displayName, email?, code?, commissionBps? }` — code auto-slug if empty |
| PATCH | `/partners/:id` | pause, rename, % |
| DELETE | `/partners/:id` | soft: PAUSED + code suffix `_archived` |
| GET | `/commissions` | `?partnerId=&status=&from=&to=` |
| POST | `/commissions/:id/mark-paid` | `{ payoutNote? }` |
| POST | `/commissions/bulk-mark-paid` | `{ ids: [] }` |
| GET | `/export.csv` | commissions for accounting |

Публичный storefront:

| Method | Path |
|--------|------|
| POST | `/api/store/:tenantSlug/affiliate/attribution` |
| GET | `/api/store/:tenantSlug/affiliate/resolve?code=` → `{ valid, displayName }` (для UI «Referred by …») |

Permission: новый ключ `affiliates` (или reuse `growth`). Owner + Admin full; Staff read-only по желанию.

---

## Merchant UI

**Размещение:** вкладка **Creators & affiliates** на `/growth` (рядом с Gift cards), либо отдельный маршрут `/affiliates` с пунктом в nav под **Discounts**.

**Экраны:**

1. **Overview** — toggle program, default %, cookie days, ссылка на help.
2. **Partners** — таблица: имя, код, %, статус, ссылка (copy), заказы, earned, pending payout.
3. **Commissions** — фильтр по партнёру/статусу; кнопка **Mark as paid** (с подсказкой: «Отметьте после перевода креатору вне UGCLab»); поле заметки; CSV export.
4. **Add partner** — modal: имя, email (для справки, выплаты мерчант делает сам), % (optional), custom code.

Баннер на Overview: *«UGCLab не отправляет деньги креаторам. Вы платите им напрямую (PayPal, банк и т.д.) и отмечаете выплаты здесь для учёта.»*

**Copy link helper** (как `getStorefrontUrl`):

```ts
export function getAffiliateStorefrontUrl(tenantSlug: string, code: string): string {
  const base = getStorefrontUrl(tenantSlug);
  const url = new URL(base);
  url.searchParams.set("ref", code);
  return url.toString();
}
```

**Order detail** (merchant): блок «Referred by {name}» + commission amount.

---

## Creator-facing (фаза 2)

- Magic link на `creator.{domain}/:tenant/:code` — read-only stats (без логина) **или**
- `User` + `AffiliatePartner.userId` + invite email.

Не в MVP.

---

## Connect vs MoR

| | MoR | Connect |
|--|-----|---------|
| Кто платит покупателю | Platform Stripe | Connected account |
| Комиссия креатора | Из merchant net | То же |
| Кто платит креатору | **Всегда мерчант сам** (v1 и пока не скажут иначе) | То же |

Payout с платформы мерчанту (`MerchantPayout`) и выплаты креаторам — **разные процессы**, не связаны в коде.

---

## Миграция и порядок работ

1. Prisma models + migration `20260606_affiliate_program`
2. `affiliate-attribution.ts` — resolve code, cookie helpers
3. Storefront: set cookie on `?ref=`, pass to checkout
4. `store-place-order.ts` — set `affiliatePartnerId` on order create
5. `fulfill-order.ts` + refund handlers — commission create/void
6. `merchant-balance.ts` — subtract approved affiliate commissions
7. Routes `merchant-p16` + public store route
8. `GrowthPage` tab + `api/client.ts` methods
9. `permissions.ts` — `affiliates` / map routes
10. Order detail UI

**Оценка:** ~2–3 дня backend + 1 день UI для MVP.

---

## Пример сценария

1. Мерчант включает программу, 15% default.
2. Добавляет партнёра «Anna», code `anna`, override 20%.
3. Копирует `https://shop.brand.com/?ref=anna`.
4. Покупатель переходит, cookie 30d, покупает $100.
5. Platform fee 5% → merchant net $95 → commission $19 → merchant keeps $76 в учёте баланса.
6. Мерчант переводит Anna $19 в PayPal (сам).
7. В **Commissions** нажимает **Mark as paid**, заметка `PayPal 2026-05-25` — только учёт.

---

## Риски / открытые вопросы

| Вопрос | Рекомендация v1 |
|--------|------------------|
| Комиссия с shipping/tax? | От **merchantNet** (total − platform fee), включает shipping в total |
| Скидка + affiliate | Комиссия от фактического total после discount |
| Минимальный порог выплаты | Не в v1; мерчант платит вручную |
| Несколько ref в одной сессии | last_click |
| GDPR / cookie banner | Merchant responsibility; cookie technical name documented |

---

## Связь с roadmap

README фаза 3 «Affiliate / referral» — этот документ описывает **минимальную** реализацию, которую можно выкатить раньше как фазу 2.5 внутри Growth.
