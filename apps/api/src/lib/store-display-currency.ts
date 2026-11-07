import {
  applyDisplayCurrency,
  listDisplayCurrencies,
  resolveDisplayCurrency,
} from "@ugclab/i18n/store-currency";
import { applyFxRounding, parseFxRounding } from "@ugclab/i18n/fx-rounding";
import { parseStoreMarkets } from "./store-markets.js";
import { fixedPriceForCurrency } from "./country-price.js";

export { resolveDisplayCurrency, applyDisplayCurrency, listDisplayCurrencies };

type CurrencySettings = {
  currency?: string;
  localeCurrencies?: unknown;
  markets?: unknown;
  enabledLocales?: string[];
  fxRounding?: unknown;
} | null | undefined;

export function displayCurrencyMeta(
  locale: string,
  settings: CurrencySettings,
  requested?: string | null
) {
  const baseCurrency = settings?.currency ?? "USD";
  const overrides =
    settings?.localeCurrencies &&
    typeof settings.localeCurrencies === "object" &&
    !Array.isArray(settings.localeCurrencies)
      ? (settings.localeCurrencies as Record<string, string>)
      : null;
  const markets = parseStoreMarkets(settings?.markets);
  const locales = settings?.enabledLocales?.length
    ? settings.enabledLocales
    : [locale];
  const currencies = listDisplayCurrencies(
    baseCurrency,
    locales,
    overrides,
    markets.map((m) => m.checkoutCurrency)
  );
  const asked = requested?.trim().toUpperCase() ?? "";
  const resolved = resolveDisplayCurrency(locale, baseCurrency, overrides);
  const displayCurrency = currencies.includes(asked)
    ? asked
    : currencies.includes(resolved)
      ? resolved
      : baseCurrency.toUpperCase();
  return {
    baseCurrency,
    displayCurrency,
    currencies,
    showConversion: displayCurrency !== baseCurrency.toUpperCase(),
  };
}

/** Pass the product's `translations` to honour a fixed price set for the display currency. */
export function priceForDisplay<T extends { priceAmount: number; compareAt?: number | null }>(
  item: T,
  locale: string,
  settings: CurrencySettings,
  requested?: string | null,
  translations?: unknown
) {
  const { baseCurrency, displayCurrency } = displayCurrencyMeta(
    locale,
    settings,
    requested
  );
  const converted = applyDisplayCurrency(item, baseCurrency, displayCurrency);
  const fixed =
    displayCurrency !== baseCurrency.toUpperCase()
      ? fixedPriceForCurrency(translations, displayCurrency)
      : null;
  const rules = parseFxRounding(settings?.fxRounding);
  const round = (n: number) => applyFxRounding(n, rules);
  if (fixed == null) {
    return {
      ...converted,
      priceAmount: round(converted.priceAmount),
      compareAt:
        converted.compareAt != null ? round(converted.compareAt) : null,
    };
  }
  const priceAmount = round(fixed);
  return {
    ...converted,
    priceAmount,
    compareAt:
      item.compareAt != null && item.priceAmount > 0
        ? round((item.compareAt * fixed) / item.priceAmount)
        : null,
  };
}
