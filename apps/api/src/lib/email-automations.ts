import {
  EmailAutomationType,
  OrderStatus,
  prisma,
} from "@ugclab/database";
import { sendStoreEmail } from "./tenant-email.js";
import {
  buildCampaignEmail,
  buildPersonalizeContext,
} from "./campaign-personalize.js";
import { getStorefrontUrl } from "./storefront.js";
import {
  getSegmentRecipients,
  type CampaignSegment,
} from "./email-segments.js";

const WINBACK_DAYS = 60;

function wrapShell(storeName: string, inner: string, storeUrl: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto"><p style="font-size:12px;color:#71717a">From ${storeName}</p>${inner}<p style="margin-top:24px;font-size:12px"><a href="${storeUrl}">Visit store</a></p></body></html>`;
}

export async function ensureDefaultAutomations(tenantId: string) {
  const defaults: {
    type: EmailAutomationType;
    subject: string;
    bodyHtml: string;
    delayHours: number;
  }[] = [
    {
      type: EmailAutomationType.WELCOME,
      subject: "Welcome to {{store_name}}",
      bodyHtml:
        "<p>Hi {{name}},</p><p>Thanks for joining {{store_name}}. Explore our latest products.</p><p><a href=\"{{store_url}}\">Start shopping</a></p>",
      delayHours: 0,
    },
    {
      type: EmailAutomationType.POST_PURCHASE,
      subject: "Thanks for your order at {{store_name}}",
      bodyHtml:
        "<p>Hi {{name}},</p><p>We appreciate your purchase. Need anything else?</p><p><a href=\"{{store_url}}\">Shop again</a></p>",
      delayHours: 1,
    },
    {
      type: EmailAutomationType.WINBACK,
      subject: "We miss you at {{store_name}}",
      bodyHtml:
        "<p>Hi {{name}},</p><p>Come back and see what's new{{last_order_date}}.</p><p><a href=\"{{store_url}}\">Return to store</a></p>",
      delayHours: 0,
    },
  ];

  for (const d of defaults) {
    const existing = await prisma.emailAutomation.findFirst({
      where: { tenantId, type: d.type },
    });
    if (existing) continue;
    await prisma.emailAutomation.create({
      data: {
        tenantId,
        type: d.type,
        enabled: false,
        subject: d.subject,
        bodyHtml: d.bodyHtml,
        delayHours: d.delayHours,
      },
    });
  }
}

async function sendAutomationById(
  automationId: string,
  email: string,
  name: string | null
) {
  const auto = await prisma.emailAutomation.findUnique({
    where: { id: automationId },
    include: { tenant: true },
  });
  if (!auto?.enabled) return;

  const ctx = await buildPersonalizeContext(auto.tenantId, email, name, {
    campaignId: `auto_${auto.id}`,
    utmCampaign: `automation_${auto.type.toLowerCase()}`,
  });
  const { subject, html, text } = await buildCampaignEmail(
    ctx,
    auto.subject,
    auto.bodyHtml,
    null
  );
  const storeUrl = getStorefrontUrl(auto.tenant.slug);
  await sendStoreEmail(auto.tenantId, {
    to: email,
    subject,
    html: wrapShell(auto.tenant.name, html, storeUrl),
    text,
  });
}

async function sendAutomation(
  tenantId: string,
  type: EmailAutomationType,
  email: string,
  name: string | null
) {
  const auto = await prisma.emailAutomation.findFirst({
    where: { tenantId, type },
  });
  if (!auto?.enabled) return;
  await sendAutomationById(auto.id, email, name);
}

export async function triggerWelcomeEmail(tenantId: string, email: string, name: string | null) {
  await sendAutomation(tenantId, EmailAutomationType.WELCOME, email, name);
}

export async function triggerPostPurchaseEmail(
  tenantId: string,
  email: string,
  name: string | null
) {
  const auto = await prisma.emailAutomation.findFirst({
    where: { tenantId, type: EmailAutomationType.POST_PURCHASE },
  });
  if (!auto?.enabled) return;
  const delayMs = (auto.delayHours ?? 0) * 60 * 60 * 1000;
  if (delayMs <= 0) {
    await sendAutomationById(auto.id, email, name);
    return;
  }
  setTimeout(() => {
    sendAutomationById(auto.id, email, name).catch(console.error);
  }, delayMs);
}

export async function processWinbackAutomations() {
  const automations = await prisma.emailAutomation.findMany({
    where: { enabled: true, type: EmailAutomationType.WINBACK },
    include: { tenant: true },
  });

  const cutoff = new Date(Date.now() - WINBACK_DAYS * 24 * 60 * 60 * 1000);

  for (const auto of automations) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (auto.lastRunAt && auto.lastRunAt > weekAgo) continue;

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: auto.tenantId,
        marketingOptOut: false,
        emailBounced: false,
      },
      include: {
        orders: {
          where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const c of customers) {
      const last = c.orders[0];
      if (!last || last.createdAt > cutoff) continue;
      try {
        await sendAutomationById(auto.id, c.email, c.name);
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.error("[winback]", c.email, e);
      }
    }

    await prisma.emailAutomation.update({
      where: { id: auto.id },
      data: { lastRunAt: new Date() },
    });
  }
}

/** Custom automations: weekly send to a chosen audience segment. */
export async function processCustomAutomations() {
  const automations = await prisma.emailAutomation.findMany({
    where: {
      enabled: true,
      type: EmailAutomationType.CUSTOM,
      segment: { not: null },
    },
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const auto of automations) {
    if (auto.lastRunAt && auto.lastRunAt > weekAgo) continue;
    if (!auto.segment) continue;

    const recipients = await getSegmentRecipients(
      auto.tenantId,
      auto.segment as CampaignSegment
    );

    for (const r of recipients) {
      try {
        await sendAutomationById(auto.id, r.email, r.name);
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.error("[custom-auto]", auto.id, r.email, e);
      }
    }

    await prisma.emailAutomation.update({
      where: { id: auto.id },
      data: { lastRunAt: new Date() },
    });
  }
}
