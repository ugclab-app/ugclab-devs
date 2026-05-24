import { prisma } from "@ugclab/database";

export async function validateGiftCard(
  tenantId: string,
  code: string,
  orderTotalBeforeGift: number
) {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;

  const card = await prisma.giftCard.findFirst({
    where: { tenantId, code: normalized, active: true },
  });
  if (!card) throw new Error("Invalid gift card");
  if (card.expiresAt && card.expiresAt < new Date()) {
    throw new Error("This gift card has expired");
  }
  if (card.balanceCents <= 0) {
    throw new Error("Gift card has no balance left");
  }

  const giftCardAmount = Math.min(orderTotalBeforeGift, card.balanceCents);
  return { card, giftCardAmount };
}

export function generateGiftCardCode() {
  const part = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GC-${part()}-${part()}`;
}
