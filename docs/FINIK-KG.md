# Finik KG (QR payments)

Integration for [Finik](https://www.finik.kg/) Web SDK — QR checkout via Kyrgyz bank apps.

Docs: [Integration](https://www.finik.kg/documentation/web-sdk/integration/) · [Webhooks](https://www.finik.kg/documentation/web-sdk/webhooks/)

## When it is used

Checkout uses **Finik** (instead of GoPay / Stripe) when:

1. `FINIK_API_KEY`, `FINIK_PRIVATE_PEM`, and `FINIK_ACCOUNT_ID` are set, and  
2. Store **currency** is **KGS**.

If Finik is configured, it takes priority over GoPay for KGS stores.

## Environment

```env
FINIK_API_KEY=                 # from Finik
FINIK_ACCOUNT_ID=              # Finik account that receives funds
FINIK_PRIVATE_PEM=             # full PEM of your private key (or base64); never commit
FINIK_WEBHOOK_PUBLIC_PEM=      # Finik public key for verifying webhooks (beta/prod)
FINIK_QR_NAME=Tescommerce      # optional; shown on QR page (name_en)
# FINIK_API_BASE=https://api.acquiring.averspay.kg
# FINIK_BETA=1                 # use beta API host
API_PUBLIC_URL=https://api.yourdomain.com   # webhookUrl = {API_PUBLIC_URL}/api/finik/webhook
# FINIK_SKIP_WEBHOOK_VERIFY=1  # local only — never in production
```

### Keys

```bash
openssl genrsa -out finik_private.pem 2048
openssl rsa -in finik_private.pem -pubout > finik_public.pem
```

Send `finik_public.pem` to Finik securely. Put the **private** key contents into `FINIK_PRIVATE_PEM` (you can use `\n` for newlines).

## Webhook

Endpoint: `POST {API_PUBLIC_URL}/api/finik/webhook`

Finik POSTs only on **successful** payment. The handler verifies RSA-SHA256 `signature` (unless `FINIK_SKIP_WEBHOOK_VERIFY` in local), then marks the order paid via `fulfillPaidOrder`.

## Flow

1. Buyer places order (KGS store).
2. API creates `PENDING` order → signed `POST /v1/payment` → reads `Location` (QR page).
3. Buyer pays on Finik QR page.
4. Redirect to storefront order page (`?paid=1`) — page **polls** `GET /orders/:id` until webhook marks **PAID** (Finik has no payment-query API).
5. Webhook verifies RSA signature (tries `x-forwarded-host` / `API_PUBLIC_URL` host + documented public keys), checks **amount**, then `fulfillPaidOrder`.

## Merchant setup

1. Contract / account with [Finik](https://www.finik.kg/).
2. Exchange RSA keys; get API key + account ID.
3. Store currency **KGS**; prices in admin are in **tyiyn** (1/100 som).

## Testing

- Use beta: `FINIK_BETA=1` and beta credentials.
- Tunnel (ngrok) so Finik can reach `/api/finik/webhook`.
- Unit tests: `npm run test:finik -w @ugclab/api`
