import { prisma } from "@ugclab/database";
import { processAbandonedCartReminders } from "../lib/abandoned-cart.js";
import { checkLowStockForTenant } from "../lib/low-stock.js";
import { processScheduledCampaigns } from "../lib/email-campaigns.js";
import { processWinbackAutomations } from "../lib/email-automations.js";
import { processScheduledProducts } from "../lib/scheduled-products.js";
import { processScheduledPages } from "../lib/scheduled-pages.js";
import { sendScheduledPlatformReport } from "../lib/platform-scheduled-report.js";

let lastWeeklyReportDay = -1;

export async function runScheduledJobs() {
  await processAbandonedCartReminders();
  await processScheduledCampaigns();
  await processWinbackAutomations();
  await processScheduledProducts();
  await processScheduledPages();

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

  const day = new Date().getUTCDay();
  if (day === 1 && lastWeeklyReportDay !== day) {
    lastWeeklyReportDay = day;
    try {
      await sendScheduledPlatformReport();
    } catch (e) {
      console.error("[cron] platform report", e);
    }
  }
}
