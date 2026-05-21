import { DiscountType, prisma } from "@ugclab/database";
import { randomBytes } from "crypto";

export async function validateDiscountCode(
  tenantId: string,
  code: string,
  subtotalAmount: number
) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const discount = await prisma.discountCode.findFirst({
    where: { tenantId, code: normalized, active: true },
  });
  if (!discount) throw new Error("Invalid discount code");
  if (discount.expiresAt && discount.expiresAt < new Date()) {
    throw new Error("This discount code has expired");
  }
  if (discount.maxUses != null && discount.usedCount >= discount.maxUses) {
    throw new Error("This discount code has reached its usage limit");
  }
  if (
    discount.minOrderAmount != null &&
    subtotalAmount < discount.minOrderAmount
  ) {
    throw new Error(
      `Minimum order ${(discount.minOrderAmount / 100).toFixed(2)} required`
    );
  }

  let discountAmount = 0;
  if (discount.type === DiscountType.PERCENT) {
    discountAmount = Math.round((subtotalAmount * discount.value) / 100);
  } else {
    discountAmount = Math.min(subtotalAmount, discount.value);
  }

  return { discount, discountAmount };
}

export function calcTax(
  taxableBase: number,
  taxRateBps: number,
  taxIncluded: boolean
): number {
  if (taxRateBps <= 0) return 0;
  if (taxIncluded) {
    return Math.round((taxableBase * taxRateBps) / (10000 + taxRateBps));
  }
  return Math.round((taxableBase * taxRateBps) / 10000);
}

export type ShippingQuote = { amount: number; label: string | null };

export async function resolveShipping(
  tenantId: string,
  country: string,
  subtotalAfterDiscount: number,
  totalWeightGrams = 0
): Promise<ShippingQuote> {
  const zones = await prisma.shippingZone.findMany({ where: { tenantId } });
  const cc = country.toUpperCase().slice(0, 2);
  const zone = zones.find((z) => z.countries.includes(cc));
  if (!zone) return { amount: 0, label: null };
  if (
    zone.freeShippingThreshold != null &&
    subtotalAfterDiscount >= zone.freeShippingThreshold
  ) {
    return { amount: 0, label: zone.name };
  }
  let amount = zone.flatRateAmount;
  if (zone.perKgAmount && totalWeightGrams > 0) {
    amount += Math.ceil(totalWeightGrams / 1000) * zone.perKgAmount;
  }
  return { amount, label: zone.name };
}

export function newAccessToken() {
  return randomBytes(24).toString("hex");
}

export function newDownloadToken() {
  return randomBytes(32).toString("hex");
}
