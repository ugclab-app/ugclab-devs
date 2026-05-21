import { PromotionType, prisma } from "@ugclab/database";

export type AutoPromotionResult = {
  discountAmount: number;
  freeShipping: boolean;
  applied: { type: PromotionType; value: number }[];
};

export async function applyAutoPromotions(
  tenantId: string,
  subtotalAmount: number
): Promise<AutoPromotionResult> {
  const promos = await prisma.storePromotion.findMany({
    where: { tenantId, active: true },
  });

  let discountAmount = 0;
  let freeShipping = false;
  const applied: AutoPromotionResult["applied"] = [];

  for (const p of promos) {
    const now = new Date();
    if (p.startsAt && p.startsAt > now) continue;
    if (p.endsAt && p.endsAt < now) continue;
    if (p.minOrderAmount != null && subtotalAmount < p.minOrderAmount) {
      continue;
    }
    if (p.type === PromotionType.CART_PERCENT && p.value > 0) {
      const amt = Math.round((subtotalAmount * p.value) / 100);
      discountAmount += amt;
      applied.push({ type: p.type, value: p.value });
    }
    if (p.type === PromotionType.FREE_SHIPPING) {
      freeShipping = true;
      applied.push({ type: p.type, value: 0 });
    }
  }

  discountAmount = Math.min(discountAmount, subtotalAmount);

  return { discountAmount, freeShipping, applied };
}
