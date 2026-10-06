import en from "../messages/en.json" with { type: "json" };
import ru from "../messages/ru.json" with { type: "json" };
import ky from "../messages/ky.json" with { type: "json" };
import kk from "../messages/kk.json" with { type: "json" };
import uz from "../messages/uz.json" with { type: "json" };
import { getAdminMessages, createAdminTa } from "./admin/index.js";

export const locales = ["en", "ru", "ky", "kk", "uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const storefrontMessages: Record<Locale, typeof en> = { en, ru, ky, kk, uz };

export function getMessages(locale?: string) {
  const key =
    locale && (locales as readonly string[]).includes(locale)
      ? (locale as Locale)
      : defaultLocale;
  const base = storefrontMessages[key] ?? storefrontMessages.en;
  const admin = getAdminMessages(key);
  return { ...base, admin };
}

export { getAdminMessages, createAdminTa };

export { localeLabel, storeLocaleLabels } from "./locale-labels.js";

export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: string = "en-US"
): string {
  const code = currency.toUpperCase();
  const loc = moneyLocaleFor(code, locale);
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: code,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toLocaleString(loc)} ${code}`;
  }
}

import { moneyLocaleFor } from "./store-currency.js";

export {
  applyDisplayCurrency,
  convertAmount,
  moneyLocaleFor,
  resolveDisplayCurrency,
  type Priced,
} from "./store-currency.js";

export { localizeStoreTheme } from "./storefront-theme-locale.js";
