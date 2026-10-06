/** Human-readable labels for storefront / merchant locale codes. */
export const storeLocaleLabels: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  ru: "Русский",
  ky: "Кыргызча",
  kk: "Қазақша",
  uz: "Oʻzbekcha",
};

export function localeLabel(code: string): string {
  return storeLocaleLabels[code] ?? code.toUpperCase();
}
