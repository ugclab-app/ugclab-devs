# Zapier / Make — merchant webhooks

Tescommerce does not ship a private Zapier app yet. Use **Growth → Webhooks & API** (or Make HTTP modules) with the same HTTPS endpoints.

## Events

| Event | When |
|---|---|
| `order.created` | Checkout created |
| `order.paid` | Payment captured |
| `order.fulfilled` | Merchant marks fulfilled |
| `product.created` | New product |
| `product.updated` | Product saved |
| `customer.created` | Customer record created |
| `subscription.updated` | Product subscription status changes |

## Payload shape

```json
{
  "id": "delivery_id",
  "event": "order.paid",
  "createdAt": "2026-11-02T00:00:00.000Z",
  "attempt": 1,
  "data": { "orderId": "…", "orderNumber": "1001", "totalAmount": 1999, "currency": "USD" }
}
```

Header `X-UGCLab-Signature: sha256=<hmac of raw body with endpoint secret>`.

## Make / Zapier setup

1. Create a Custom Webhook (Catch Hook) URL in Zapier/Make.
2. In merchant admin → Growth → Webhooks, add that URL and select events.
3. Send a test delivery from the admin; map fields in the zap.

OpenAPI for the REST API: `GET /api/v1/openapi.json`.
