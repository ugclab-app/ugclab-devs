const PAYOUT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "PLN",
  "TRY",
] as const;

const TAX_FORM_TYPES = ["W9", "EU_VAT", "OTHER"] as const;
export type TaxFormType = (typeof TAX_FORM_TYPES)[number];

export function isTaxFormType(v: string): v is TaxFormType {
  return (TAX_FORM_TYPES as readonly string[]).includes(v);
}

export function normalizePayoutCurrency(
  raw: unknown,
  storefrontCurrency: string
): string | null {
  if (raw == null || raw === "") return null;
  const c = String(raw).trim().toUpperCase().slice(0, 3);
  if (!(PAYOUT_CURRENCIES as readonly string[]).includes(c)) {
    return storefrontCurrency;
  }
  return c;
}

export function maskTaxFormId(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const t = id.trim();
  if (t.length <= 4) return "****";
  return `****${t.slice(-4)}`;
}
