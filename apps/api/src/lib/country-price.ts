/** Per-country catalog prices in store-currency cents, stored on product translations. */
export function priceForCountry(
  priceAmount: number,
  translations: unknown,
  country?: string | null
): number {
  const cc = country?.trim().toUpperCase().slice(0, 2) ?? "";
  if (!cc || !translations || typeof translations !== "object" || Array.isArray(translations)) {
    return priceAmount;
  }
  const map = (translations as Record<string, unknown>)._countryPrices;
  if (!map || typeof map !== "object" || Array.isArray(map)) return priceAmount;
  const raw = (map as Record<string, unknown>)[cc];
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : priceAmount;
}

export function parseCountryPrices(raw: string): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const line of raw.split(/[\n,;]+/)) {
    const match = line.trim().match(/^([A-Za-z]{2})\s*[:=]\s*([0-9]+(?:\.[0-9]{1,2})?)$/);
    if (!match) continue;
    out[match[1]!.toUpperCase()] = Math.round(parseFloat(match[2]!) * 100);
  }
  return Object.keys(out).length ? out : null;
}
