/** Client copy of delivery ETA helper (keep in sync with API lib). */

export type DeliveryEta = {
  minDays: number;
  maxDays: number;
  fromLabel: string;
  toLabel: string;
  summary: string;
};

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = Math.max(0, days);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return d;
}

function formatDay(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale || "en", { month: "short", day: "numeric" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function estimateDeliveryEta(opts: {
  productType?: string | null;
  minDays?: number | null;
  maxDays?: number | null;
  locale?: string;
}): DeliveryEta | null {
  const type = (opts.productType ?? "PHYSICAL").toUpperCase();
  if (type === "DIGITAL" || type === "SERVICE" || type === "GIFT_CARD") return null;
  const minDays = Math.max(1, Math.min(60, Math.trunc(opts.minDays ?? 5)));
  let maxDays = Math.max(minDays, Math.trunc(opts.maxDays ?? 7));
  maxDays = Math.min(90, maxDays);
  const from = new Date();
  const locale = opts.locale ?? "en";
  const fromDate = addBusinessDays(from, minDays);
  const toDate = addBusinessDays(from, maxDays);
  const fromLabel = formatDay(fromDate, locale);
  const toLabel = formatDay(toDate, locale);
  return {
    minDays,
    maxDays,
    fromLabel,
    toLabel,
    summary:
      fromLabel === toLabel ? `Arrives ${fromLabel}` : `Arrives ${fromLabel} – ${toLabel}`,
  };
}
