# Platform MoR payments

`PAYMENT_MODEL=mor` (default in `.env.example`) — **no Stripe Connect** for store checkout.

## Flow

1. Buyer pays via Stripe Checkout on the **platform** Stripe account (full order amount).
2. Stripe webhook `checkout.session.completed` → order **PAID**, stock, emails.
3. Order stores `platformFeeAmount` — platform commission.
4. Merchant balance = sum(paid orders × (total − fee)) − payouts.

## Env (platform)

```env
PAYMENT_MODEL=mor
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # stripe listen or Dashboard webhook
```

Local webhook:

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Events used: `checkout.session.completed`, `charge.refunded`, `charge.dispute.*`, subscription events.

## Merchant admin (:3001)

- **Payments** — MoR balance, request payout (`PENDING`).
- **Orders** — MoR fee / net on order detail; **Mark as paid** if webhook missed; **Refund (Stripe)** on paid orders.
- Connect onboarding is **disabled** in MoR mode.

## Platform admin (:3003)

- Tenant detail → **MoR payouts** section: balance, mark payout paid, record manual payout.

## Refunds

- **Full refund** — order → **REFUNDED**, Stripe `refunds.create`.
- **Partial refund** — by line items on order detail; order stays **PAID**, event logged.
- Webhook `charge.refunded` syncs full vs partial.

## Disputes

Webhook `charge.dispute.created|updated|closed` → order event `STRIPE_DISPUTE`; counted in merchant notifications.

## Payouts

- `MOR_MIN_PAYOUT_CENTS` — minimum request (default 5000 = $50).
- `MOR_PAYOUT_SCHEDULE` — label shown to merchants.
- Statuses: **Requested** (`PENDING`) → **In processing** (`PROCESSING`) → **Paid** (`PAID`).
- Email: merchant notified on request, processing, and paid (`RESEND_API_KEY` / `SENDGRID_API_KEY`).
- Optional `PLATFORM_OPS_EMAIL` — alert when a merchant requests a payout.
- CSV export: merchant **Export payouts CSV**; platform **Export all payouts CSV**.

## Checkout options (store theme)

- **Stripe Tax** — `stripeTaxEnabled` in theme / Settings → Appearance.
- **PayPal** — `stripePaypalEnabled` (enable PayPal in Stripe Dashboard).
- **Link** — `stripeLinkEnabled` (default on).

## Order tools

- **Sync from Stripe** — pending orders when webhook missed.
- **Mark as paid** — manual fallback.

## Switch to Connect (optional)

```env
PAYMENT_MODEL=connect
```

Merchants connect Stripe Express; checkout uses `transfer_data` to connected accounts.

## After schema change

```bash
npm run db:push:force
npm run db:generate:safe
```
