/**
 * MoR risk controls: first-payout hold, new-shop GMV cap, dispute auto-freeze.
 * Pure helpers are unit-tested; DB wrappers wire into payout/checkout/disputes.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Days a brand-new store waits before the first payout can be requested. Default 14. */
export function getMorFirstPayoutHoldDays(): number {
  return envInt("MOR_FIRST_PAYOUT_HOLD_DAYS", 14);
}

/** How long a store is treated as "new" for GMV caps. Default 7. */
export function getMorNewShopDays(): number {
  return envInt("MOR_NEW_SHOP_DAYS", 7);
}

/** Max GMV (order totals) a new shop may take in its first week. Default $500. 0 = off. */
export function getMorNewShopWeeklyGmvCents(): number {
  return envInt("MOR_NEW_SHOP_WEEKLY_GMV_CENTS", 50_000);
}

/** Open/lost disputes that trigger auto-suspend. Default 3. 0 = off. */
export function getMorDisputeFreezeThreshold(): number {
  return envInt("MOR_DISPUTE_FREEZE_THRESHOLD", 3);
}

export function isNewShop(
  createdAt: Date,
  now: Date,
  newShopDays = getMorNewShopDays()
): boolean {
  if (newShopDays <= 0) return false;
  return now.getTime() - createdAt.getTime() < newShopDays * DAY_MS;
}

export function firstPayoutHoldUntil(
  createdAt: Date,
  holdDays = getMorFirstPayoutHoldDays()
): Date | null {
  if (holdDays <= 0) return null;
  return new Date(createdAt.getTime() + holdDays * DAY_MS);
}

/** First payout is held until holdUntil unless the store already has a PAID payout. */
export function isFirstPayoutHeld(opts: {
  createdAt: Date;
  hasPaidPayout: boolean;
  now?: Date;
  holdDays?: number;
}): { held: boolean; until: Date | null } {
  if (opts.hasPaidPayout) return { held: false, until: null };
  const until = firstPayoutHoldUntil(
    opts.createdAt,
    opts.holdDays ?? getMorFirstPayoutHoldDays()
  );
  if (!until) return { held: false, until: null };
  const now = opts.now ?? new Date();
  return { held: now < until, until };
}

export function assertNewShopGmvAllowed(opts: {
  isNew: boolean;
  weekGmvCents: number;
  orderCents: number;
  capCents?: number;
}): string | null {
  const cap = opts.capCents ?? getMorNewShopWeeklyGmvCents();
  if (!opts.isNew || cap <= 0) return null;
  if (opts.weekGmvCents + opts.orderCents > cap) {
    const rem = Math.max(0, cap - opts.weekGmvCents);
    return `New store limit: max $${(cap / 100).toFixed(0)} in the first week. Remaining allowance: $${(rem / 100).toFixed(2)}.`;
  }
  return null;
}

/** Stripe dispute statuses that still count against the freeze threshold. */
export const OPEN_OR_LOST_DISPUTE_STATUSES = new Set([
  "needs_response",
  "warning_needs_response",
  "under_review",
  "warning_under_review",
  "charge_refunded",
  "lost",
]);

export function disputeCountsTowardFreeze(status: string | null | undefined): boolean {
  if (!status) return true;
  return OPEN_OR_LOST_DISPUTE_STATUSES.has(status);
}

export function shouldFreezeOnDisputeCount(
  openOrLostCount: number,
  threshold = getMorDisputeFreezeThreshold()
): boolean {
  if (threshold <= 0) return false;
  return openOrLostCount >= threshold;
}

export type MorPayoutRiskInput = {
  tenantStatus: string;
  createdAt: Date;
  hasPaidPayout: boolean;
  kycApproved: boolean;
  availableCents: number;
  amountCents: number;
  minPayoutCents: number;
  now?: Date;
  holdDays?: number;
};

export type MorPayoutRiskResult = {
  ok: boolean;
  error?: string;
  code?:
    | "SUSPENDED"
    | "KYC"
    | "FIRST_PAYOUT_HOLD"
    | "NO_BALANCE"
    | "BELOW_MIN";
  firstPayoutHoldUntil?: string | null;
};

export function evaluateMorPayoutRequest(
  input: MorPayoutRiskInput
): MorPayoutRiskResult {
  if (input.tenantStatus !== "ACTIVE") {
    return {
      ok: false,
      error: "Store is suspended — payouts are blocked until review.",
      code: "SUSPENDED",
    };
  }
  if (!input.kycApproved) {
    return {
      ok: false,
      error: "Payout opens after Tescommerce approves your passport check.",
      code: "KYC",
    };
  }
  const hold = isFirstPayoutHeld({
    createdAt: input.createdAt,
    hasPaidPayout: input.hasPaidPayout,
    now: input.now,
    holdDays: input.holdDays,
  });
  if (hold.held) {
    return {
      ok: false,
      error: `First payout is held until ${hold.until!.toISOString().slice(0, 10)} (new store risk hold).`,
      code: "FIRST_PAYOUT_HOLD",
      firstPayoutHoldUntil: hold.until!.toISOString(),
    };
  }
  if (input.amountCents <= 0 || input.availableCents <= 0) {
    return { ok: false, error: "No balance available for payout", code: "NO_BALANCE" };
  }
  if (input.amountCents < input.minPayoutCents) {
    return {
      ok: false,
      error: `Minimum payout is ${input.minPayoutCents / 100} (set MOR_MIN_PAYOUT_CENTS)`,
      code: "BELOW_MIN",
    };
  }
  return {
    ok: true,
    firstPayoutHoldUntil: hold.until?.toISOString() ?? null,
  };
}
