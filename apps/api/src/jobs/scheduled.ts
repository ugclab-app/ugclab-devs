import { prisma } from "@ugclab/database";
import { processAbandonedCartReminders } from "../lib/abandoned-cart.js";
import { checkLowStockForTenant } from "../lib/low-stock.js";
import { processScheduledCampaigns } from "../lib/email-campaigns.js";
import { processWinbackAutomations, processCustomAutomations } from "../lib/email-automations.js";
import { processScheduledProducts } from "../lib/scheduled-products.js";
import { processScheduledPages } from "../lib/scheduled-pages.js";
import { sendScheduledPlatformReport } from "../lib/platform-scheduled-report.js";
import { autoVerifyPendingDomains } from "../lib/domain-auto-verify.js";
import { processScheduledThemePublish } from "../lib/theme-meta.js";
import { processStockAlerts } from "../lib/stock-alerts.js";
import { processBuyerProtection } from "../lib/buyer-protection.js";
import { releaseMaturePlatformReferrals } from "../lib/platform-partner.js";

let lastWeeklyReportDay = -1;

let lastDomainVerifyHour = -1;

export async function runScheduledJobs() {
  const hour = new Date().getUTCHours();
  if (hour % 6 === 0 && lastDomainVerifyHour !== hour) {
    lastDomainVerifyHour = hour;
    try {
      const r = await autoVerifyPendingDomains(40);
      if (r.verified > 0) {
        console.log(`[cron] auto-verified ${r.verified}/${r.checked} domains`);
      }
    } catch (e) {
      console.error("[cron] domain auto-verify", e);
    }
  }

  await processAbandonedCartReminders();
  try {
    await processBuyerProtection();
  } catch (e) {
    console.error("[cron] buyer protection", e);
  }
  try {
    const released = await releaseMaturePlatformReferrals();
    if (released.released > 0) {
      console.log(`[cron] platform partner commissions released: ${released.released}`);
    }
  } catch (e) {
    console.error("[cron] platform partner", e);
  }
  try {
    const stock = await processStockAlerts();
    if (stock.sent > 0) console.log(`[cron] stock alerts sent: ${stock.sent}`);
  } catch (e) {
    console.error("[cron] stock alerts", e);
  }
  await processScheduledCampaigns();
  await processWinbackAutomations();
  await processCustomAutomations();
  await processScheduledProducts();
  await processScheduledPages();
  try {
    const r = await processScheduledThemePublish();
    if (r.published > 0) {
      console.log(`[cron] published ${r.published} scheduled theme(s)`);
    }
  } catch (e) {
    console.error("[cron] scheduled theme publish", e);
  }

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
