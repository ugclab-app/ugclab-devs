/** Recommended store settings for Central Asia markets. */
export type CaPresetId = "kg" | "kz" | "uz";

export const CA_REGION_PRESETS: Record<
  CaPresetId,
  {
    currency: string;
    timezone: string;
    defaultLocale: string;
    enabledLocales: string[];
  }
> = {
  kg: {
    currency: "KGS",
    timezone: "Asia/Bishkek",
    defaultLocale: "ru",
    enabledLocales: ["ru", "ky", "en"],
  },
  kz: {
    currency: "KZT",
    timezone: "Asia/Almaty",
    defaultLocale: "ru",
    enabledLocales: ["ru", "kk", "en"],
  },
  uz: {
    currency: "UZS",
    timezone: "Asia/Tashkent",
    defaultLocale: "uz",
    enabledLocales: ["uz", "ru", "en"],
  },
};
