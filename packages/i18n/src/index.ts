import en from "../messages/en.json" with { type: "json" };
import ru from "../messages/ru.json" with { type: "json" };

export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const messages: Record<Locale, typeof en> = { en, ru };

export function getMessages(locale: Locale = defaultLocale) {
  return messages[locale] ?? messages.en;
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export {
  applyDisplayCurrency,
  convertAmount,
  moneyLocaleFor,
  resolveDisplayCurrency,
  type Priced,
} from "./store-currency.js";
