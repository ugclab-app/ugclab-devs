/** Store markets: country groups + optional tax + checkout currency (Shopify Markets–lite). */

export type StoreMarket = {
  id: string;
  name: string;
  countries: string[];
  taxRateBps?: number | null;
  /** ISO currency charged at checkout for this market (FX via static rates). */
  checkoutCurrency?: string | null;
};

export function parseLocaleCurrencies(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && /^[A-Za-z]{3}$/.test(v.trim())) {
      out[k.toLowerCase().slice(0, 5)] = v.trim().toUpperCase();
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseCurrencyCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

export function parseStoreMarkets(raw: unknown): StoreMarket[] {
  if (!Array.isArray(raw)) return [];
  const markets: StoreMarket[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const countries = Array.isArray(o.countries)
      ? o.countries
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.toUpperCase().slice(0, 2))
          .filter(Boolean)
      : [];
    if (!id || !name || !countries.length) continue;
    let taxRateBps: number | null | undefined;
    if (o.taxRateBps === null) taxRateBps = null;
    else if (typeof o.taxRateBps === "number" && Number.isFinite(o.taxRateBps)) {
      taxRateBps = Math.max(0, Math.round(o.taxRateBps));
    } else if (typeof o.taxRateBps === "string" && o.taxRateBps.trim() !== "") {
      const n = parseInt(o.taxRateBps, 10);
      if (Number.isFinite(n)) taxRateBps = Math.max(0, n);
    }
    const checkoutCurrency = parseCurrencyCode(o.checkoutCurrency);
    markets.push({
      id,
      name,
      countries,
      taxRateBps,
      checkoutCurrency,
    });
  }
  return markets;
}

/** Resolve flat tax bps: market override for shipping country, else store default. */
export function resolveTaxRateBps(opts: {
  shippingCountry?: string | null;
  defaultTaxRateBps: number;
  markets?: StoreMarket[] | unknown;
}): number {
  const cc = (opts.shippingCountry ?? "").toUpperCase().slice(0, 2);
  if (!cc) return opts.defaultTaxRateBps;
  const markets = Array.isArray(opts.markets)
    ? (opts.markets as StoreMarket[])
    : parseStoreMarkets(opts.markets);
  const hit = markets.find((m) => m.countries.includes(cc));
  if (hit && hit.taxRateBps != null && Number.isFinite(hit.taxRateBps)) {
    return hit.taxRateBps;
  }
  return opts.defaultTaxRateBps;
}

/** Charge currency for checkout by shipping country market, else store base. */
export function resolveCheckoutCurrency(opts: {
  shippingCountry?: string | null;
  baseCurrency: string;
  markets?: StoreMarket[] | unknown;
}): string {
  const base = (opts.baseCurrency || "USD").toUpperCase();
  const cc = (opts.shippingCountry ?? "").toUpperCase().slice(0, 2);
  if (!cc) return base;
  const markets = Array.isArray(opts.markets)
    ? (opts.markets as StoreMarket[])
    : parseStoreMarkets(opts.markets);
  const hit = markets.find((m) => m.countries.includes(cc));
  if (hit?.checkoutCurrency) return hit.checkoutCurrency;
  return base;
}

export function normalizeMarketsInput(raw: unknown): StoreMarket[] {
  return parseStoreMarkets(raw);
}
