import { OrderStatus, prisma } from "@ugclab/database";
import { sumOwedToCreatorsCents } from "./affiliate.js";
import {
  computeMerchantBalanceFromRows,
  merchantNetFromOrder,
} from "./merchant-balance-math.js";

export { merchantNetFromOrder };

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

export async function getMerchantBalance(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });
  if (!tenant) throw new Error("Tenant not found");

  const storefrontCurrency = tenant.settings?.currency ?? "USD";
  const payoutCurrency =
    tenant.settings?.payoutCurrency?.trim().toUpperCase() || storefrontCurrency;

  const orders = await prisma.order.findMany({
    where: { tenantId, status: { in: [...PAID_STATUSES] } },
    select: {
      totalAmount: true,
      platformFeeAmount: true,
      buyerProtection: true,
      fundsReleasedAt: true,
      payoutBlocked: true,
    },
  });

  const payouts = await prisma.merchantPayout.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const owedToCreatorsCents = await sumOwedToCreatorsCents(tenantId);
  const computed = computeMerchantBalanceFromRows({
    orders,
    payouts,
    owedToCreatorsCents,
  });

  return {
    currency: payoutCurrency,
    storefrontCurrency,
    payoutCurrency,
    ...computed,
    payouts,
  };
}
