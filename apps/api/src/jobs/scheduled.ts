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
import { syncAllSupplierTracking } from "../lib/suppliers.js";
import { processActivationNudges } from "../lib/activation-nudge.js";
import { refreshFxRatesIfStale } from "../lib/fx-rates.js";
import { processWebhookRetries } from "../lib/merchant-webhooks.js";
import { processDueJobs } from "../lib/job-queue.js";
import {
  processPlatformDunning,
  processProductSubscriptionDunning,
} from "../lib/billing-dunning.js";

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

  try {
    const fx = await refreshFxRatesIfStale();
    if (fx.refreshed) console.log("[cron] FX rates refreshed");
  } catch (e) {
    console.error("[cron] FX rates", e);
  }

  try {
    const nudged = await processActivationNudges();
    if (nudged.sent > 0) console.log(`[cron] activation nudges sent: ${nudged.sent}`);
  } catch (e) {
    console.error("[cron] activation nudge", e);
  }

  try {
    const tracking = await syncAllSupplierTracking();
    if (tracking.updated > 0) {
      console.log(`[cron] supplier tracking updated: ${tracking.updated}`);
    }
  } catch (e) {
    console.error("[cron] supplier tracking", e);
  }

  try {
    const jobs = await processDueJobs();
    if (jobs.processed > 0) {
      console.log(`[cron] background jobs: ${jobs.ok} ok / ${jobs.fail} fail`);
    }
  } catch (e) {
    console.error("[cron] background jobs", e);
  }

  try {
    const wh = await processWebhookRetries();
    if (wh.retried > 0) console.log(`[cron] webhook retries: ${wh.retried}`);
  } catch (e) {
    console.error("[cron] webhook retries", e);
  }

  try {
    const d1 = await processPlatformDunning();
    const d2 = await processProductSubscriptionDunning();
    if (d1.sent + d2.sent > 0) {
      console.log(`[cron] dunning emails: platform=${d1.sent} product=${d2.sent}`);
    }
  } catch (e) {
    console.error("[cron] dunning", e);
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
