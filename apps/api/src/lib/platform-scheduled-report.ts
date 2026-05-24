import { OrderStatus, prisma } from "@ugclab/database";
import { getPlatformSettings } from "./platform-settings.js";
import { sendEmail } from "./email.js";

export async function sendScheduledPlatformReport(): Promise<boolean> {
  const settings = await getPlatformSettings();
  if (!settings.scheduledReportsEnabled || !settings.scheduledReportEmail) {
    return false;
  }

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [tenants, orders, gmv] = await Promise.all([
    prisma.tenant.count(),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const gmvUsd = ((gmv._sum.totalAmount ?? 0) / 100).toFixed(2);
  const html = `
    <h2>Tescommerce weekly platform report</h2>
    <ul>
      <li>Total stores: ${tenants}</li>
      <li>Paid orders (30d): ${orders}</li>
      <li>GMV (30d): $${gmvUsd}</li>
    </ul>
  `;

  await sendEmail({
    to: settings.scheduledReportEmail,
    subject: "Tescommerce platform weekly report",
    html,
    template: "scheduled-report",
  });
  return true;
}
