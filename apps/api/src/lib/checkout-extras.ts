/** Pure helpers for checkout add-ons: tips, custom fields, country blocks, PWYW, BNPL. */

export type CheckoutField = {
  key: string;
  label: string;
  type: "text" | "date" | "textarea";
  required: boolean;
};

export function parseCheckoutFields(raw: unknown): CheckoutField[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckoutField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = String(o.label ?? "").trim().slice(0, 80);
    if (!label) continue;
    const key =
      String(o.key ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
    if (!key || out.some((f) => f.key === key)) continue;
    const type =
      o.type === "date" || o.type === "textarea" ? o.type : ("text" as const);
    out.push({ key, label, type, required: o.required === true });
  }
  return out.slice(0, 10);
}

/** Validate buyer answers against the field definitions. Throws on missing required. */
export function collectCustomFieldAnswers(
  fields: CheckoutField[],
  answers: unknown
): Record<string, string> | null {
  if (fields.length === 0) return null;
  const src =
    answers && typeof answers === "object"
      ? (answers as Record<string, unknown>)
      : {};
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = String(src[f.key] ?? "").trim().slice(0, f.type === "textarea" ? 1000 : 200);
    if (f.required && !v) throw new Error(`${f.label} is required`);
    if (v) out[f.key] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function normalizeBlockedCountries(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(/[\s,;]+/);
  return [
    ...new Set(
      list
        .map((c) => String(c).trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ];
}

export function isCountryBlocked(blocked: string[] | undefined, country: string): boolean {
  if (!blocked?.length) return false;
  return blocked.includes(country.toUpperCase());
}

/** Tip amount in cents from either a percent preset or a custom cents value. */
export function resolveTipCents(opts: {
  enabled: boolean;
  presets: number[];
  subtotalCents: number;
  tipPercent?: unknown;
  tipCents?: unknown;
}): number {
  if (!opts.enabled || opts.subtotalCents <= 0) return 0;
  const custom = parseInt(String(opts.tipCents ?? ""), 10);
  if (Number.isFinite(custom) && custom > 0) {
    return Math.min(custom, opts.subtotalCents * 5);
  }
  const pct = parseInt(String(opts.tipPercent ?? ""), 10);
  if (Number.isFinite(pct) && pct > 0 && opts.presets.includes(pct)) {
    return Math.round((opts.subtotalCents * pct) / 100);
  }
  return 0;
}

/** Pay-what-you-want: clamp the buyer's chosen unit price to the product minimum. */
export function resolvePwywUnit(opts: {
  payWhatYouWant: boolean;
  priceAmount: number;
  minPriceAmount: number | null;
  requestedCents: unknown;
}): number | null {
  if (!opts.payWhatYouWant) return null;
  const min = Math.max(0, opts.minPriceAmount ?? opts.priceAmount);
  const req = parseInt(String(opts.requestedCents ?? ""), 10);
  if (!Number.isFinite(req) || req < 0) return null;
  return Math.max(min, req);
}

const BNPL_BY_CURRENCY: Record<string, string[]> = {
  USD: ["klarna", "afterpay_clearpay", "affirm"],
  CAD: ["klarna", "afterpay_clearpay", "affirm"],
  GBP: ["klarna", "afterpay_clearpay"],
  EUR: ["klarna"],
  AUD: ["klarna", "afterpay_clearpay"],
  NZD: ["klarna", "afterpay_clearpay"],
  SEK: ["klarna"],
  NOK: ["klarna"],
  DKK: ["klarna"],
  PLN: ["klarna"],
  CHF: ["klarna"],
  CZK: ["klarna"],
};

/** Stripe BNPL payment method types available for a currency. */
export function bnplMethodsForCurrency(currency: string): string[] {
  return BNPL_BY_CURRENCY[currency.toUpperCase()] ?? [];
}
