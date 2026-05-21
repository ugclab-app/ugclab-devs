import en from "../messages/en.json";

export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const messages: Record<Locale, typeof en> = { en };

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
