/** Demo static rates: 1 unit of base → display multiplier (base assumed USD-scale). */
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  PLN: 3.95,
  CAD: 1.36,
  KGS: 89,
  KZT: 450,
  UZS: 12_500,
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
  ru: "USD",
  ky: "KGS",
  kk: "KZT",
  uz: "UZS",
};

export function listDisplayCurrencies(
  baseCurrency: string,
  locales: string[],
  overrides?: Record<string, string> | null,
  extra: Array<string | null | undefined> = []
): string[] {
  const set = new Set<string>();
  const add = (code?: string | null) => {
    if (!code) return;
    const up = code.toUpperCase();
    if (RATES[up]) set.add(up);
  };
  add(baseCurrency);
  for (const locale of locales) {
    add(resolveDisplayCurrency(locale, baseCurrency, overrides));
  }
  if (overrides) {
    for (const value of Object.values(overrides)) add(value);
  }
  for (const code of extra) add(code);
  return [...set];
}

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

const LOCALE_BCP47: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  ky: "ky-KG",
  kk: "kk-KZ",
  uz: "uz-UZ",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

export function moneyLocaleFor(displayCurrency: string, locale: string): string {
  const map: Record<string, string> = {
    EUR: "de-DE",
    GBP: "en-GB",
    PLN: "pl-PL",
    USD: "en-US",
    KGS: "ru-KG",
    KZT: "kk-KZ",
    UZS: "uz-UZ",
  };
  const key = locale.toLowerCase().slice(0, 2);
  return map[displayCurrency] ?? LOCALE_BCP47[key] ?? locale;
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
