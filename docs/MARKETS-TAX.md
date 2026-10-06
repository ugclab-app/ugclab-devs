# Markets & Taxes

## Display currency ≠ checkout currency

- **Checkout / orders** always use `StoreSettings.currency` (one charge currency).
- **Catalog browse** can show prices in a locale-specific display currency via `StoreSettings.localeCurrencies` (e.g. `{ "ru": "KGS", "en": "USD" }`). Conversion is display-only (`store-display-currency`).

## Country tax (Markets)

`StoreSettings.markets` is a JSON list:

```json
[{ "id": "kg", "name": "Kyrgyzstan", "countries": ["KG"], "taxRateBps": 1200 }]
```

At place-order (when Stripe Tax is off), tax uses the market `taxRateBps` for the shipping country if set; otherwise the store default `taxRateBps`.

If a market has `checkoutCurrency` (ISO code), checkout charges in that currency (amounts converted via static FX rates from the store base currency). Otherwise checkout uses `StoreSettings.currency`.

## Stripe Tax

- Source of truth: `StoreSettings.stripeTaxEnabled`.
- Saving Tax settings (or Growth tax) syncs the flag into `theme` / `themeDraft` JSON for older storefront paths.
- When enabled, place-order does not apply flat/country bps (Stripe calculates tax on the session).

Configure under **Settings → Tax** and **Settings → Markets**. Themes are block presets (JSON + React), not Shopify Liquid.
