import {
  applyDisplayCurrency,
  resolveDisplayCurrency,
} from "@ugclab/i18n/store-currency";

export { resolveDisplayCurrency, applyDisplayCurrency };

export function displayCurrencyMeta(
  locale: string,
  settings: { currency?: string; localeCurrencies?: unknown } | null | undefined
) {
  const baseCurrency = settings?.currency ?? "USD";
  const overrides =
    settings?.localeCurrencies &&
    typeof settings.localeCurrencies === "object" &&
    !Array.isArray(settings.localeCurrencies)
      ? (settings.localeCurrencies as Record<string, string>)
      : null;
  const displayCurrency = resolveDisplayCurrency(locale, baseCurrency, overrides);
  return { baseCurrency, displayCurrency, showConversion: displayCurrency !== baseCurrency.toUpperCase() };
}

export function priceForDisplay<T extends { priceAmount: number; compareAt?: number | null }>(
  item: T,
  locale: string,
  settings: { currency?: string; localeCurrencies?: unknown } | null | undefined
) {
  const { baseCurrency, displayCurrency } = displayCurrencyMeta(locale, settings);
  return applyDisplayCurrency(item, baseCurrency, displayCurrency);
}
