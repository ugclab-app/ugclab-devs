import {
  applyDisplayCurrency,
  listDisplayCurrencies,
  resolveDisplayCurrency,
} from "@ugclab/i18n/store-currency";
import { parseStoreMarkets } from "./store-markets.js";

export { resolveDisplayCurrency, applyDisplayCurrency, listDisplayCurrencies };

type CurrencySettings = {
  currency?: string;
  localeCurrencies?: unknown;
  markets?: unknown;
  enabledLocales?: string[];
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

export function priceForDisplay<T extends { priceAmount: number; compareAt?: number | null }>(
  item: T,
  locale: string,
  settings: CurrencySettings,
  requested?: string | null
) {
  const { baseCurrency, displayCurrency } = displayCurrencyMeta(
    locale,
    settings,
    requested
  );
  return applyDisplayCurrency(item, baseCurrency, displayCurrency);
}
