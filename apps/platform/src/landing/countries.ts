/** Countries offered in the "Can I sell from my country?" checker. */
export const checkerCountries = [
  "KG", "KZ", "UZ", "TJ", "AZ", "GE", "AM", "TR", "AE", "SA", "EG", "MA", "NG", "KE", "GH", "ZA",
  "PK", "BD", "IN", "ID", "PH", "VN", "BR", "MX", "AR", "CO", "UA", "RS", "US", "GB", "DE", "FR",
  "ES", "IT", "NL", "PL", "CA", "AU", "JP", "CH",
] as const;

const EURO_AREA = new Set(["DE", "FR", "ES", "IT", "NL"]);

/** Local payout currency where we support one (see PAYOUT_CURRENCIES in apps/api payout-profile). */
const LOCAL_PAYOUT: Record<string, string> = {
  KG: "KGS",
  KZ: "KZT",
  UZ: "UZS",
  TR: "TRY",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  CH: "CHF",
  PL: "PLN",
};

const LOCAL_METHODS: Record<string, string[]> = {
  KG: ["Finik QR", "GoPay"],
};

export function payoutCurrencies(country: string | null): string[] {
  if (!country) return ["USD", "EUR"];
  if (EURO_AREA.has(country)) return ["EUR", "USD"];
  const local = LOCAL_PAYOUT[country];
  return local ? [local, "USD"] : ["USD", "EUR"];
}

export function localPaymentMethods(country: string | null): string[] {
  return (country && LOCAL_METHODS[country]) || [];
}

/** Names locals use, where ICU's default differs. */
const NAME_OVERRIDES: Record<string, Record<string, string>> = {
  ru: { KG: "Кыргызстан" },
};

export function countryName(code: string, locale: string): string {
  const override = NAME_OVERRIDES[locale]?.[code];
  if (override) return override;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
