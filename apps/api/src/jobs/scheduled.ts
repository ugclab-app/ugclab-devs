import { prisma } from "@ugclab/database";
import { processAbandonedCartReminders } from "../lib/abandoned-cart.js";
import { checkLowStockForTenant } from "../lib/low-stock.js";
import { processScheduledCampaigns } from "../lib/email-campaigns.js";
import { processWinbackAutomations } from "../lib/email-automations.js";
import { processScheduledProducts } from "../lib/scheduled-products.js";

export async function runScheduledJobs() {
  await processAbandonedCartReminders();
  await processScheduledCampaigns();
  await processWinbackAutomations();
  await processScheduledProducts();

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 200,
  });
  for (const t of tenants) {
    try {
      await checkLowStockForTenant(t.id);
    } catch (e) {
      console.error("[cron] low stock", t.id, e);
    }
  }
}
