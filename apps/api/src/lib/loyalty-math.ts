export type LoyaltySettings = {
  enabled: boolean;
  earnPerMajor: number;
  redeemCentsPerPoint: number;
};

export function loyaltyFromSettings(settings: {
  loyaltyEnabled?: boolean | null;
  loyaltyEarnPerMajor?: number | null;
  loyaltyRedeemCentsPerPoint?: number | null;
} | null): LoyaltySettings {
  return {
    enabled: settings?.loyaltyEnabled === true,
    earnPerMajor: Math.max(0, settings?.loyaltyEarnPerMajor ?? 1),
    redeemCentsPerPoint: Math.max(0, settings?.loyaltyRedeemCentsPerPoint ?? 1),
  };
}

/** Max points a customer may redeem for this order subtotal (before loyalty discount). */
export function maxRedeemablePoints(
  balance: number,
  orderSubtotalCents: number,
  redeemCentsPerPoint: number
): number {
  if (balance <= 0 || redeemCentsPerPoint <= 0 || orderSubtotalCents <= 0) return 0;
  const byValue = Math.floor(orderSubtotalCents / redeemCentsPerPoint);
  return Math.min(balance, byValue);
}

export function pointsToDiscountCents(points: number, redeemCentsPerPoint: number): number {
  return Math.max(0, points) * Math.max(0, redeemCentsPerPoint);
}

export function earnPointsForPaidTotal(totalCents: number, earnPerMajor: number): number {
  if (earnPerMajor <= 0 || totalCents <= 0) return 0;
  return Math.floor(totalCents / 100) * earnPerMajor;
}
