import { OrderStatus, prisma } from "@ugclab/database";
import { createUnsubscribeToken } from "./marketing-tokens.js";
import { getStorefrontUrl } from "./storefront.js";

const API_PUBLIC = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`;

export type PersonalizeContext = {
  tenantId: string;
  tenantSlug: string;
  storeName: string;
  email: string;
  name: string | null;
  discountCode?: string | null;
  utmCampaign?: string | null;
  campaignId: string;
};

export async function buildPersonalizeContext(
  tenantId: string,
  email: string,
  name: string | null,
  opts?: { discountCode?: string | null; utmCampaign?: string | null; campaignId: string }
): Promise<PersonalizeContext> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  return {
    tenantId,
    tenantSlug: tenant.slug,
    storeName: tenant.name,
    email,
    name,
    discountCode: opts?.discountCode,
    utmCampaign: opts?.utmCampaign,
    campaignId: opts?.campaignId ?? "preview",
  };
}

export async function getLastOrderDateLabel(
  tenantId: string,
  email: string
): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
    include: {
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const last = customer?.orders[0];
  if (!last) return "";
  return ` on ${last.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function personalizeText(
  text: string,
  ctx: PersonalizeContext,
  extras: { lastOrderDate?: string; unsubscribeUrl: string }
): string {
  const storeUrl = getStorefrontUrl(ctx.tenantSlug);
  const utm = ctx.utmCampaign
    ? `utm_source=email&utm_campaign=${encodeURIComponent(ctx.utmCampaign)}`
    : "utm_source=email";
  const storeUrlTracked = storeUrl.includes("?")
    ? `${storeUrl}&${utm}`
    : `${storeUrl}?${utm}`;

  return text
    .replace(/\{\{name\}\}/gi, ctx.name ?? "there")
    .replace(/\{\{store_name\}\}/gi, ctx.storeName)
    .replace(/\{\{store_url\}\}/gi, storeUrlTracked)
    .replace(/\{\{discount_code\}\}/gi, ctx.discountCode ?? "")
    .replace(/\{\{utm_campaign\}\}/gi, ctx.utmCampaign ?? "campaign")
    .replace(/\{\{last_order_date\}\}/gi, extras.lastOrderDate ?? "")
    .replace(/\{\{unsubscribe_url\}\}/gi, extras.unsubscribeUrl);
}

export function wrapTrackedLinks(html: string, campaignId: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_m, url: string) => {
      if (url.includes("/api/marketing/")) return `href="${url}"`;
      const tracked = `${API_PUBLIC}/api/marketing/click/${campaignId}?u=${encodeURIComponent(url)}`;
      return `href="${tracked}"`;
    }
  );
}

export function trackingPixelHtml(campaignId: string): string {
  return `<img src="${API_PUBLIC}/api/marketing/open/${campaignId}.gif" width="1" height="1" alt="" style="display:none" />`;
}

export async function buildCampaignEmail(
  ctx: PersonalizeContext,
  subject: string,
  bodyHtml: string,
  plainText?: string | null
): Promise<{ subject: string; html: string; text: string }> {
  const unsubscribeUrl = `${API_PUBLIC}/api/marketing/unsubscribe?token=${createUnsubscribeToken(ctx.tenantId, ctx.email)}`;
  const lastOrderDate = await getLastOrderDateLabel(ctx.tenantId, ctx.email);

  let html = personalizeText(bodyHtml, ctx, { lastOrderDate, unsubscribeUrl });
  html = wrapTrackedLinks(html, ctx.campaignId);
  html += trackingPixelHtml(ctx.campaignId);
  html += `<p style="margin-top:24px;font-size:11px;color:#71717a;"><a href="${unsubscribeUrl}">Unsubscribe</a></p>`;

  const subj = personalizeText(subject, ctx, { lastOrderDate, unsubscribeUrl });
  const text =
    plainText?.trim() ||
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return { subject: subj, html, text };
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
