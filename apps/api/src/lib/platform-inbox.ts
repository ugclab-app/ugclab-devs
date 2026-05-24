import { OrderStatus, prisma, TenantStatus } from "@ugclab/database";
import { getPlatformActionItems, type PlatformActionItem } from "./platform-action-items.js";
import { isMorPaymentModel } from "./payment-model.js";

export async function getPlatformInbox(): Promise<{
  items: PlatformActionItem[];
  counts: Record<string, number>;
}> {
  const items = await getPlatformActionItems();

  const [failedWebhooks, noFirstOrder, pendingReviews] = await Promise.all([
    prisma.stripeWebhookEvent.count({
      where: {
        processed: false,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.tenant.count({
      where: {
        status: TenantStatus.ACTIVE,
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        orders: {
          none: {
            status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
          },
        },
      },
    }),
    prisma.productReview.count({ where: { approved: false } }),
  ]);

  if (failedWebhooks > 0) {
    items.unshift({
      id: "failed-webhooks",
      priority: "high",
      title: "Stripe webhooks need attention",
      description: `${failedWebhooks} event(s) failed or unprocessed (7d)`,
      href: "/integrations",
      count: failedWebhooks,
    });
  }

  if (noFirstOrder > 0) {
    items.push({
      id: "no-first-order",
      priority: "medium",
      title: "Stores without first order",
      description: `${noFirstOrder} store(s) older than 30d with no paid order`,
      href: "/tenants",
      count: noFirstOrder,
    });
  }

  if (pendingReviews > 0) {
    items.push({
      id: "pending-reviews",
      priority: "medium",
      title: "Reviews awaiting moderation",
      description: `${pendingReviews} pending review(s)`,
      href: "/moderation",
      count: pendingReviews,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    items,
    counts: {
      failedWebhooks,
      noFirstOrder,
      pendingReviews,
      morEnabled: isMorPaymentModel() ? 1 : 0,
    },
  };
}
