# GoPay KG (local payments)

Integration for [GoPay Kyrgyzstan](https://doc.gopay.kg/v1/) — MBank, MegaPay, ELQR, etc.

## When it is used

Checkout uses **GoPay** (instead of Stripe) when:

1. `GOPAY_API_KEY` and `GOPAY_SECRET_KEY` are set, and  
2. Store **currency** is **KGS** (Settings → Region & languages).

Otherwise the existing Stripe / demo flow applies.

## Environment

```env
GOPAY_API_KEY=          # GoPay-Api-Key from merchant dashboard
GOPAY_SECRET_KEY=       # HMAC signing secret (server only)
GOPAY_WEBHOOK_SECRET=   # Developer → Webhooks (recommended; falls back to SECRET_KEY)
API_PUBLIC_URL=https://api.yourdomain.com   # for callback_url in create payment
GOPAY_TESTING_MODE=1    # optional: auto-commit test payments without real bank
```

## Webhook

In [merchant.gopay.kg](https://merchant.gopay.kg) → **Developer → Webhooks**:

- **events_url:** `https://YOUR_API_HOST/api/gopay/webhook`
- Subscribe to `payment.committed` (and `payment.failed` for logging)

The handler verifies `GoPay-Nonce` + `GoPay-Signature` (HMAC-SHA512, same scheme as API).

## Flow

1. Buyer places order on storefront (KGS store).
2. API `POST /api/store/checkout/place` → creates `PENDING` order → `POST https://api.gopay.kg/v1/payments`.
3. Buyer redirected to `checkout_url` (`pay.gopay.kg`).
4. GoPay webhook → order **PAID**, stock, emails (same as Stripe `fulfillPaidOrder`).

## Merchant setup

1. Contract with GoPay / Bakai Bank ([gopay.kg](https://www.gopay.kg)).
2. API keys in dashboard.
3. Store currency **KGS**; prices in admin are in **tyiyn** (1/100 som), same as cents.

## Testing

- Set `GOPAY_TESTING_MODE=1` — GoPay commits payment without a real bank op and sends webhook.
- Use a tunnel (ngrok) for webhook URL in local dev.

## API reference

- Docs: [doc.gopay.kg/v1](https://doc.gopay.kg/v1/)
- Create payment: `POST /v1/payments`
- Query: `POST /v1/payments/query`
