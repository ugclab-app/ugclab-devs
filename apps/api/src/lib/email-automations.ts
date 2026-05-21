import { EmailAutomationType, OrderStatus, prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";
import {
  buildCampaignEmail,
  buildPersonalizeContext,
} from "./campaign-personalize.js";
import { getStorefrontUrl } from "./storefront.js";

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
    await prisma.emailAutomation.upsert({
      where: { tenantId_type: { tenantId, type: d.type } },
      create: {
        tenantId,
        type: d.type,
        enabled: false,
        subject: d.subject,
        bodyHtml: d.bodyHtml,
        delayHours: d.delayHours,
      },
      update: {},
    });
  }
}

async function sendAutomation(
  tenantId: string,
  type: EmailAutomationType,
  email: string,
  name: string | null
) {
  const auto = await prisma.emailAutomation.findUnique({
    where: { tenantId_type: { tenantId, type } },
    include: { tenant: true },
  });
  if (!auto?.enabled) return;

  const ctx = await buildPersonalizeContext(tenantId, email, name, {
    campaignId: `auto_${type}`,
    utmCampaign: `automation_${type.toLowerCase()}`,
  });
  const { subject, html, text } = await buildCampaignEmail(
    ctx,
    auto.subject,
    auto.bodyHtml,
    null
  );
  const storeUrl = getStorefrontUrl(auto.tenant.slug);
  await sendEmail({
    to: email,
    subject,
    html: wrapShell(auto.tenant.name, html, storeUrl),
    text,
  });
}

export async function triggerWelcomeEmail(tenantId: string, email: string, name: string | null) {
  await sendAutomation(tenantId, EmailAutomationType.WELCOME, email, name);
}

export async function triggerPostPurchaseEmail(
  tenantId: string,
  email: string,
  name: string | null
) {
  const auto = await prisma.emailAutomation.findUnique({
    where: { tenantId_type: { tenantId, type: EmailAutomationType.POST_PURCHASE } },
  });
  if (!auto?.enabled) return;
  const delayMs = (auto.delayHours ?? 0) * 60 * 60 * 1000;
  if (delayMs <= 0) {
    await sendAutomation(tenantId, EmailAutomationType.POST_PURCHASE, email, name);
    return;
  }
  setTimeout(() => {
    sendAutomation(tenantId, EmailAutomationType.POST_PURCHASE, email, name).catch(
      console.error
    );
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
        await sendAutomation(auto.tenantId, EmailAutomationType.WINBACK, c.email, c.name);
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
