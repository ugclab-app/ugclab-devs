import { prisma } from "@ugclab/database";
import {
  earnPointsForPaidTotal,
  loyaltyFromSettings,
} from "./loyalty-math.js";

export type { LoyaltySettings } from "./loyalty-math.js";
export {
  loyaltyFromSettings,
  maxRedeemablePoints,
  pointsToDiscountCents,
  earnPointsForPaidTotal,
} from "./loyalty-math.js";

export async function applyLoyaltyEarn(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: { include: { settings: true } } },
  });
  if (!order?.customerId) return;
  const loyalty = loyaltyFromSettings(order.tenant.settings);
  if (!loyalty.enabled) return;
  const earned = earnPointsForPaidTotal(
    Math.max(0, order.totalAmount - (order.loyaltyDiscountAmount ?? 0)),
    loyalty.earnPerMajor
  );
  if (earned <= 0) return;
  await prisma.customer.update({
    where: { id: order.customerId },
    data: { loyaltyPoints: { increment: earned } },
  });
}
