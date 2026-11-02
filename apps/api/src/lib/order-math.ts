/**
 * Pure money math shared by checkout (store-place-order) and refunds.
 * Everything is integer cents; no Prisma imports so it can be unit-tested.
 */

export function calcTax(
  taxableBase: number,
  taxRateBps: number,
  taxIncluded: boolean
): number {
  if (taxRateBps <= 0 || taxableBase <= 0) return 0;
  if (taxIncluded) {
    return Math.round((taxableBase * taxRateBps) / (10000 + taxRateBps));
  }
  return Math.round((taxableBase * taxRateBps) / 10000);
}

export type TotalsInput = {
  subtotal: number;
  /** Auto promotions + discount code, before clamping. */
  discountAmount: number;
  shippingAmount: number;
  taxRateBps: number;
  taxIncluded: boolean;
  /** When Stripe Tax computes tax at payment time we store 0. */
  stripeTaxEnabled?: boolean;
  giftWrapAmount?: number;
  tipAmount?: number;
};

export type Totals = {
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  totalBeforeCredits: number;
};

/** Discount is clamped to the subtotal; tax applies to goods + shipping after discount. */
export function composeTotals(i: TotalsInput): Totals {
  const discountAmount = Math.max(0, Math.min(i.discountAmount, i.subtotal));
  const afterDiscount = i.subtotal - discountAmount;
  const taxAmount = i.stripeTaxEnabled
    ? 0
    : calcTax(afterDiscount + i.shippingAmount, i.taxRateBps, i.taxIncluded);
  const totalBeforeCredits =
    afterDiscount + i.shippingAmount + taxAmount + (i.giftWrapAmount ?? 0) + (i.tipAmount ?? 0);
  return { discountAmount, afterDiscount, taxAmount, totalBeforeCredits };
}

export type CreditsInput = {
  /** Gift card balance available (already validated), 0 when none. */
  giftCardBalance?: number;
  /** Loyalty discount the buyer is entitled to, in cents (already capped by points). */
  loyaltyDiscount?: number;
  /** Store credit balance available. */
  storeCreditBalance?: number;
};

export type CreditsApplied = {
  giftCardAmount: number;
  loyaltyDiscountAmount: number;
  storeCreditAmount: number;
  total: number;
};

/**
 * Apply stored-value credits in the same order checkout does: gift card → loyalty → store credit.
 * Each one is clamped to what is still owed, so the total never goes negative.
 */
export function applyCredits(totalBeforeCredits: number, c: CreditsInput): CreditsApplied {
  let total = Math.max(0, totalBeforeCredits);
  const giftCardAmount = Math.min(Math.max(0, c.giftCardBalance ?? 0), total);
  total -= giftCardAmount;
  const loyaltyDiscountAmount = Math.min(Math.max(0, c.loyaltyDiscount ?? 0), total);
  total -= loyaltyDiscountAmount;
  const storeCreditAmount = Math.min(Math.max(0, c.storeCreditBalance ?? 0), total);
  total -= storeCreditAmount;
  return { giftCardAmount, loyaltyDiscountAmount, storeCreditAmount, total };
}

export type RefundLine = { id: string; unitAmount: number; quantity: number };
export type RefundLineRequest = { lineId: string; quantity: number };

/**
 * Amount to refund: sum of requested lines (qty clamped to what was bought), else the
 * explicit amount, else the whole order. Always within (0, orderTotal].
 */
export function refundAmountCents(
  order: { totalAmount: number; items: RefundLine[] },
  opts: { amountCents?: number | null; lineItems?: RefundLineRequest[] | null }
): number {
  let amount: number | undefined;
  if (opts.lineItems?.length) {
    amount = 0;
    for (const req of opts.lineItems) {
      const line = order.items.find((i) => i.id === req.lineId);
      if (!line || req.quantity <= 0) continue;
      amount += line.unitAmount * Math.min(req.quantity, line.quantity);
    }
  } else if (opts.amountCents != null && opts.amountCents > 0) {
    amount = Math.trunc(opts.amountCents);
  }
  if (amount == null || amount <= 0) amount = order.totalAmount;
  return Math.min(amount, order.totalAmount);
}

export function isPartialRefund(amount: number, orderTotal: number): boolean {
  return amount > 0 && amount < orderTotal;
}
