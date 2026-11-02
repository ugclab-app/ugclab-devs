export type QuantityOffer = { qty: number; label: string; priceCents: number };

export function parseQuantityOffers(raw: unknown): QuantityOffer[] {
  let value = raw;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      value = JSON.parse(text);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const offers: QuantityOffer[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { qty?: unknown; label?: unknown; priceCents?: unknown; price?: unknown };
    const qty = Math.round(Number(record.qty));
    const priceCents =
      record.priceCents != null
        ? Math.round(Number(record.priceCents))
        : Math.round(Number(record.price) * 100);
    const label = String(record.label ?? "").trim().slice(0, 40);
    if (!Number.isFinite(qty) || qty < 1 || qty > 8) continue;
    if (!Number.isFinite(priceCents) || priceCents <= 0) continue;
    offers.push({ qty, label: label || `${qty}`, priceCents });
  }
  return offers.slice(0, 6);
}

export function splitOfferUnits(totalCents: number, count: number) {
  const base = Math.floor(totalCents / count);
  const units = Array.from({ length: count }, () => base);
  units[count - 1] = totalCents - base * (count - 1);
  return units;
}
