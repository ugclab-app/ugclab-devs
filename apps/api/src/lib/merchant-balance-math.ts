/** Keep in sync with RESERVE_BPS in buyer-protection.ts (avoid importing prisma here). */
export const BALANCE_RESERVE_BPS = 1000;

export function merchantNetFromOrder(totalAmount: number, platformFeeAmount: number) {
  return Math.max(0, totalAmount - platformFeeAmount);
}

export type BalanceOrderRow = {
  totalAmount: number;
  platformFeeAmount: number;
  buyerProtection: boolean;
  fundsReleasedAt: Date | null;
  payoutBlocked: boolean;
};

export type BalancePayoutRow = {
  amount: number;
  status: string;
};

/**
 * Pure MoR balance math used by getMerchantBalance and money-path tests.
 * Refunded orders leave the paid set; disputed/refund-blocked rows set payoutBlocked.
 */
export function computeMerchantBalanceFromRows(opts: {
  orders: BalanceOrderRow[];
  payouts: BalancePayoutRow[];
  owedToCreatorsCents?: number;
  reserveBps?: number;
}) {
  const reserveBps = opts.reserveBps ?? BALANCE_RESERVE_BPS;
  let earnedCents = 0;
  let platformFeesCents = 0;
  let heldCents = 0;
  let releasedProtectedCents = 0;
  let releasedOpenCents = 0;

  for (const o of opts.orders) {
    const net = merchantNetFromOrder(o.totalAmount, o.platformFeeAmount);
    platformFeesCents += o.platformFeeAmount;
    if (o.payoutBlocked) continue;
    earnedCents += net;
    if (o.buyerProtection && !o.fundsReleasedAt) heldCents += net;
    else if (o.buyerProtection) releasedProtectedCents += net;
    else releasedOpenCents += net;
  }

  const reserveCents = Math.floor((releasedProtectedCents * reserveBps) / 10000);
  const paidOutCents = opts.payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amount, 0);
  const pendingPayoutCents = opts.payouts
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.amount, 0);
  const owedToCreatorsCents = opts.owedToCreatorsCents ?? 0;

  const availableCents = Math.max(
    0,
    releasedOpenCents +
      releasedProtectedCents -
      reserveCents -
      paidOutCents -
      pendingPayoutCents -
      owedToCreatorsCents
  );

  return {
    earnedCents,
    heldCents,
    reserveCents,
    platformFeesCents,
    paidOutCents,
    pendingPayoutCents,
    owedToCreatorsCents,
    availableCents,
  };
}

/** Simulate payment → optional refund → payout request → mark paid for tests. */
export function simulateMoneyPath(steps: {
  paidOrders: Array<{
    totalAmount: number;
    platformFeeAmount: number;
    buyerProtection?: boolean;
    fundsReleasedAt?: Date | null;
    refunded?: boolean;
    disputed?: boolean;
  }>;
  payoutRequests?: Array<{ amount: number; status?: string }>;
  owedToCreatorsCents?: number;
}) {
  const orders: BalanceOrderRow[] = steps.paidOrders
    .filter((o) => !o.refunded)
    .map((o) => ({
      totalAmount: o.totalAmount,
      platformFeeAmount: o.platformFeeAmount,
      buyerProtection: o.buyerProtection ?? false,
      fundsReleasedAt: o.fundsReleasedAt ?? null,
      payoutBlocked: Boolean(o.disputed),
    }));
  const payouts: BalancePayoutRow[] = (steps.payoutRequests ?? []).map((p) => ({
    amount: p.amount,
    status: p.status ?? "PENDING",
  }));
  return computeMerchantBalanceFromRows({
    orders,
    payouts,
    owedToCreatorsCents: steps.owedToCreatorsCents,
  });
}
