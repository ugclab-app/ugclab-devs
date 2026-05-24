import { OrderStatus, prisma, TenantStatus } from "@ugclab/database";
import { isMorPaymentModel } from "./payment-model.js";
import { getMorPlatformMetrics } from "./mor-platform-metrics.js";

export type PlatformActionItem = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  count?: number;
};

export async function getPlatformActionItems(): Promise<PlatformActionItem[]> {
  const items: PlatformActionItem[] = [];
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (isMorPaymentModel()) {
    const mor = await getMorPlatformMetrics();
    if (mor.pendingPayoutCount > 0) {
      items.push({
        id: "pending-payouts",
        priority: "high",
        title: "Process merchant payouts",
        description: `${mor.pendingPayoutCount} request(s) · ${(mor.pendingPayoutCents / 100).toFixed(2)} USD pending`,
        href: "/payouts?status=open",
        count: mor.pendingPayoutCount,
      });
    }
    if (mor.merchantDebtCents > 0) {
      items.push({
        id: "merchant-debt",
        priority: "medium",
        title: "Review merchant balances owed",
        description: `~${(mor.merchantDebtCents / 100).toFixed(2)} USD earned not yet scheduled for payout`,
        href: "/tenants",
      });
    }
    if (mor.openDisputeEvents > 0) {
      items.push({
        id: "disputes",
        priority: "high",
        title: "Review Stripe disputes",
        description: `${mor.openDisputeEvents} dispute event(s) in the last 90 days`,
        href: "/disputes",
        count: mor.openDisputeEvents,
      });
    }
    const topOwed = mor.tenantBalances.filter((b) => b.availableCents >= 5000).slice(0, 3);
    for (const t of topOwed) {
      items.push({
        id: `payout-${t.tenantId}`,
        priority: "medium",
        title: `Payout due: ${t.name}`,
        description: `${(t.availableCents / 100).toFixed(2)} ${t.currency} available`,
        href: `/tenants/${t.tenantId}`,
      });
    }
  }

  const inactive = await prisma.tenant.count({
    where: {
      status: TenantStatus.ACTIVE,
      createdAt: { lt: d30 },
      orders: {
        none: {
          status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
          createdAt: { gte: d30 },
        },
      },
    },
  });
  if (inactive > 0) {
    items.push({
      id: "inactive-stores",
      priority: "low",
      title: "Reach out to inactive stores",
      description: `${inactive} active store(s) with no paid orders in 30 days`,
      href: "/tenants",
      count: inactive,
    });
  }

  const suspended = await prisma.tenant.count({
    where: { status: TenantStatus.SUSPENDED },
  });
  if (suspended > 0) {
    items.push({
      id: "suspended",
      priority: "medium",
      title: "Review suspended tenants",
      description: `${suspended} suspended store(s)`,
      href: "/tenants?status=SUSPENDED",
      count: suspended,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
