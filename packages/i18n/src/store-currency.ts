/** Demo static rates: 1 unit of base → display multiplier (base assumed USD-scale). */
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  PLN: 3.95,
  CAD: 1.36,
};

const LOCALE_CURRENCY: Record<string, string> = {
  en: "USD",
  de: "EUR",
  fr: "EUR",
  nl: "EUR",
  es: "EUR",
  it: "EUR",
  pl: "PLN",
  gb: "GBP",
  uk: "GBP",
};

export function resolveDisplayCurrency(
  locale: string,
  baseCurrency: string,
  overrides?: Record<string, string> | null
): string {
  const key = locale.toLowerCase().slice(0, 2);
  const fromOverride = overrides?.[locale] ?? overrides?.[key];
  if (fromOverride && RATES[fromOverride.toUpperCase()]) {
    return fromOverride.toUpperCase();
  }
  const mapped = LOCALE_CURRENCY[key];
  if (mapped && mapped !== baseCurrency.toUpperCase()) return mapped;
  return baseCurrency.toUpperCase();
}

export function convertAmount(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amountMinor;
  const fromRate = RATES[from] ?? 1;
  const toRate = RATES[to] ?? 1;
  const inBase = amountMinor / fromRate;
  return Math.round(inBase * toRate);
}

export function moneyLocaleFor(displayCurrency: string, locale: string): string {
  const map: Record<string, string> = {
    EUR: "de-DE",
    GBP: "en-GB",
    PLN: "pl-PL",
    USD: "en-US",
  };
  return map[displayCurrency] ?? locale;
}

export type Priced = {
  priceAmount: number;
  compareAt?: number | null;
};

export function applyDisplayCurrency<T extends Priced>(
  item: T,
  baseCurrency: string,
  displayCurrency: string
): T & { displayCurrency: string; baseCurrency: string } {
  return {
    ...item,
    priceAmount: convertAmount(item.priceAmount, baseCurrency, displayCurrency),
    compareAt:
      item.compareAt != null
        ? convertAmount(item.compareAt, baseCurrency, displayCurrency)
        : null,
    baseCurrency: baseCurrency.toUpperCase(),
    displayCurrency,
  };
}
