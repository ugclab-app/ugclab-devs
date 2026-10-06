import { Hono } from "hono";
import {
  EmailCampaignSegment,
  EmailCampaignStatus,
  EmailAutomationType,
  ProductStatus,
  prisma,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { logActivity } from "../lib/activity-log.js";
import {
  countSentToday,
  processScheduledCampaigns,
  sendEmailCampaign,
  sendTestCampaignDraft,
  sendTestCampaignEmail,
} from "../lib/email-campaigns.js";
import { EMAIL_CAMPAIGN_TEMPLATES } from "../lib/email-campaign-templates.js";
import { ensureDefaultAutomations } from "../lib/email-automations.js";
import {
  getSegmentRecipients,
  segmentLabel,
  type CampaignSegment,
} from "../lib/email-segments.js";
import {
  getMerchantAccess,
  hasPermission,
} from "../lib/permissions.js";
import { htmlToPlain } from "../lib/campaign-personalize.js";

const marketing = new Hono<AuthEnv>();
marketing.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  return { tenant, session, access, userEmail: user?.email ?? session.email };
}

const SEGMENTS = Object.values(EmailCampaignSegment) as CampaignSegment[];

function parseSegmentParams(body: Record<string, unknown>) {
  return {
    collectionSlug: body.collectionSlug ? String(body.collectionSlug).trim() : null,
    productId: body.productId ? String(body.productId).trim() : null,
  };
}

marketing.get("/marketing/campaigns/:id/ab-report", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);
  const sent = campaign.sentCount || 0;
  const openRate = sent > 0 ? Math.round((campaign.openCount / sent) * 1000) / 10 : 0;
  const clickRate = sent > 0 ? Math.round((campaign.clickCount / sent) * 1000) / 10 : 0;
  const hasAb = Boolean(campaign.subjectB?.trim() && campaign.abTestPercent > 0);
  const sentB = hasAb
    ? Math.min(sent, Math.floor((campaign.recipientCount * campaign.abTestPercent) / 100))
    : 0;
  const sentA = Math.max(0, sent - sentB);
  const rateA = sentA > 0 ? campaign.openCountA / sentA : 0;
  const rateB = sentB > 0 ? campaign.openCountB / sentB : 0;
  let winner: string | null = null;
  if (hasAb && (campaign.openCountA > 0 || campaign.openCountB > 0)) {
    winner = rateB > rateA ? campaign.subjectB : campaign.subject;
  }
  return c.json({
    campaignId: campaign.id,
    status: campaign.status,
    sentCount: sent,
    openCount: campaign.openCount,
    clickCount: campaign.clickCount,
    openRatePct: openRate,
    clickRatePct: clickRate,
    hasAbTest: hasAb,
    abTestPercent: campaign.abTestPercent,
    subjectA: campaign.subject,
    subjectB: campaign.subjectB,
    sentA,
    sentB,
    openCountA: campaign.openCountA,
    openCountB: campaign.openCountB,
    openRateAPct: Math.round(rateA * 1000) / 10,
    openRateBPct: Math.round(rateB * 1000) / 10,
    suggestedWinner: winner,
    note: hasAb
      ? winner
        ? `Subject ${winner === campaign.subjectB ? "B" : "A"} has the higher open rate.`
        : "Waiting for opens on both subjects before naming a winner."
      : null,
  });
});

marketing.get("/marketing/campaigns", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await ensureDefaultAutomations(tenant.id);

  const [campaigns, automations, collections, products, sentToday] = await Promise.all([
    prisma.emailCampaign.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.emailAutomation.findMany({ where: { tenantId: tenant.id } }),
    prisma.collection.findMany({
      where: { tenantId: tenant.id },
      select: { slug: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.product.findMany({
      where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
      select: { id: true, title: true },
      take: 100,
      orderBy: { title: "asc" },
    }),
    countSentToday(tenant.id),
  ]);

  return c.json({
    campaigns,
    automations,
    templates: EMAIL_CAMPAIGN_TEMPLATES,
    collections,
    products,
    segments: SEGMENTS.map((s) => ({ id: s, label: segmentLabel(s) })),
    emailConfigured: Boolean(
      process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
    ),
    dailyCap: Number(process.env.MARKETING_DAILY_CAP_PER_TENANT ?? "2000"),
    sentToday,
    bulkConfirmThreshold: 500,
  });
});

marketing.get("/marketing/campaigns/preview-recipients", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const segment = String(c.req.query("segment") ?? "ALL").toUpperCase() as CampaignSegment;
  if (!SEGMENTS.includes(segment)) {
    return c.json({ error: "Invalid segment" }, 400);
  }

  const recipients = await getSegmentRecipients(tenant.id, segment, {
    collectionSlug: c.req.query("collectionSlug") ?? null,
    productId: c.req.query("productId") ?? null,
  });
  return c.json({
    segment,
    count: recipients.length,
    preview: recipients.slice(0, 10).map((r) => r.email),
  });
});

marketing.post("/marketing/campaigns", async (c) => {
  const { tenant, session, access, userEmail } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const segment = String(body.segment ?? "ALL").toUpperCase() as CampaignSegment;
  const subject = String(body.subject ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? "").trim();
  const opts = parseSegmentParams(body);

  if (!SEGMENTS.includes(segment)) return c.json({ error: "Invalid segment" }, 400);
  if (!subject || subject.length < 3) return c.json({ error: "Subject required" }, 400);
  if (!bodyHtml || bodyHtml.length < 10) {
    return c.json({ error: "Email body required (min 10 chars)" }, 400);
  }

  const scheduledAtRaw = body.scheduledAt ? String(body.scheduledAt) : null;
  let scheduledAt: Date | null = null;
  if (scheduledAtRaw) {
    scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return c.json({ error: "Invalid schedule time" }, 400);
    }
  }

  const recipients = await getSegmentRecipients(tenant.id, segment, opts);

  const campaign = await prisma.emailCampaign.create({
    data: {
      tenantId: tenant.id,
      name: body.name?.toString().trim() || subject.slice(0, 80),
      segment: segment as EmailCampaignSegment,
      subject,
      subjectB: body.subjectB ? String(body.subjectB).trim() : null,
      abTestPercent: parseInt(String(body.abTestPercent ?? "0"), 10) || 0,
      bodyHtml,
      plainText: body.plainText ? String(body.plainText) : htmlToPlain(bodyHtml),
      templateId: body.templateId ? String(body.templateId) : null,
      discountCode: body.discountCode ? String(body.discountCode).trim() : null,
      utmCampaign: body.utmCampaign
        ? String(body.utmCampaign).trim()
        : `camp_${Date.now().toString(36).slice(2, 8)}`,
      collectionSlug: opts.collectionSlug,
      productId: opts.productId,
      recipientCount: recipients.length,
      createdByEmail: userEmail,
      status: scheduledAt
        ? EmailCampaignStatus.SCHEDULED
        : EmailCampaignStatus.DRAFT,
      scheduledAt,
    },
  });

  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail,
    action: "marketing.campaign.create",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Created email campaign “${campaign.name ?? subject}”`,
    meta: { segment, recipientCount: recipients.length, scheduledAt },
  });

  return c.json({ campaign }, 201);
});

marketing.patch("/marketing/campaigns/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);
  if (
    campaign.status !== EmailCampaignStatus.DRAFT &&
    campaign.status !== EmailCampaignStatus.SCHEDULED
  ) {
    return c.json({ error: "Only drafts or scheduled campaigns can be edited" }, 400);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const segment = body.segment
    ? (String(body.segment).toUpperCase() as CampaignSegment)
    : (campaign.segment as CampaignSegment);
  const opts = parseSegmentParams({
    collectionSlug: body.collectionSlug ?? campaign.collectionSlug,
    productId: body.productId ?? campaign.productId,
  });

  const subject = body.subject != null ? String(body.subject).trim() : campaign.subject;
  const bodyHtml = body.bodyHtml != null ? String(body.bodyHtml).trim() : campaign.bodyHtml;
  const recipients = await getSegmentRecipients(tenant.id, segment, opts);

  let scheduledAt = campaign.scheduledAt;
  if (body.scheduledAt !== undefined) {
    if (body.scheduledAt === null || body.scheduledAt === "") {
      scheduledAt = null;
    } else {
      scheduledAt = new Date(String(body.scheduledAt));
    }
  }

  const updated = await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      segment: SEGMENTS.includes(segment) ? (segment as EmailCampaignSegment) : undefined,
      subject,
      subjectB: body.subjectB !== undefined ? String(body.subjectB || "") || null : undefined,
      abTestPercent:
        body.abTestPercent !== undefined
          ? parseInt(String(body.abTestPercent), 10) || 0
          : undefined,
      bodyHtml,
      plainText:
        body.plainText !== undefined
          ? String(body.plainText)
          : bodyHtml
            ? htmlToPlain(bodyHtml)
            : undefined,
      discountCode:
        body.discountCode !== undefined
          ? String(body.discountCode || "") || null
          : undefined,
      utmCampaign:
        body.utmCampaign !== undefined
          ? String(body.utmCampaign || "") || null
          : undefined,
      collectionSlug: opts.collectionSlug,
      productId: opts.productId,
      recipientCount: recipients.length,
      scheduledAt,
      status: scheduledAt
        ? EmailCampaignStatus.SCHEDULED
        : EmailCampaignStatus.DRAFT,
    },
  });

  return c.json({ campaign: updated });
});

marketing.post("/marketing/campaigns/:id/duplicate", async (c) => {
  const { tenant, access, userEmail } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const src = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!src) return c.json({ error: "Not found" }, 404);

  const campaign = await prisma.emailCampaign.create({
    data: {
      tenantId: src.tenantId,
      name: `${src.name ?? src.subject} (copy)`,
      segment: src.segment,
      subject: src.subject,
      subjectB: src.subjectB,
      abTestPercent: src.abTestPercent,
      bodyHtml: src.bodyHtml,
      plainText: src.plainText,
      templateId: src.templateId,
      discountCode: src.discountCode,
      utmCampaign: src.utmCampaign,
      collectionSlug: src.collectionSlug,
      productId: src.productId,
      recipientCount: src.recipientCount,
      createdByEmail: userEmail,
      status: EmailCampaignStatus.DRAFT,
      scheduledAt: null,
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      clickCount: 0,
    },
  });
  return c.json({ campaign }, 201);
});

marketing.post("/marketing/campaigns/:id/test", async (c) => {
  const { tenant, access, userEmail } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    return c.json({ error: "Email provider not configured" }, 503);
  }

  let body: { email?: string } = {};
  try {
    body = await c.req.json<{ email?: string }>();
  } catch {
    /* empty body */
  }
  const to = body.email?.trim() || userEmail;
  if (!to) return c.json({ error: "Email required" }, 400);

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);

  await sendTestCampaignEmail(campaign.id, to);
  return c.json({ ok: true, sentTo: to });
});

/** Test send without saving a campaign first. */
marketing.post("/marketing/campaigns/test-draft", async (c) => {
  const { tenant, access, userEmail } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    return c.json({ error: "Email provider not configured" }, 503);
  }
  const body = await c.req.json<{
    email?: string;
    subject?: string;
    bodyHtml?: string;
    discountCode?: string;
    utmCampaign?: string;
  }>();
  const to = body.email?.trim() || userEmail;
  if (!to) return c.json({ error: "Email required" }, 400);
  if (!String(body.subject ?? "").trim() && !String(body.bodyHtml ?? "").trim()) {
    return c.json({ error: "Subject or body required" }, 400);
  }
  await sendTestCampaignDraft({
    tenantId: tenant.id,
    toEmail: to,
    subject: String(body.subject ?? ""),
    bodyHtml: String(body.bodyHtml ?? ""),
    discountCode: body.discountCode,
    utmCampaign: body.utmCampaign,
  });
  return c.json({ ok: true, sentTo: to });
});

marketing.post("/marketing/campaigns/:id/cancel", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);
  if (campaign.status !== EmailCampaignStatus.SCHEDULED) {
    return c.json({ error: "Only scheduled campaigns can be cancelled" }, 400);
  }
  const updated = await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: EmailCampaignStatus.DRAFT, scheduledAt: null },
  });
  return c.json({ campaign: updated });
});

marketing.post("/marketing/campaigns/:id/send", async (c) => {
  const { tenant, session, access, userEmail } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    return c.json(
      {
        error:
          "Email provider not configured. Add RESEND_API_KEY or SENDGRID_API_KEY to .env",
      },
      503
    );
  }

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);
  if (campaign.status === EmailCampaignStatus.SENT) {
    return c.json({ error: "Already sent" }, 400);
  }
  if (campaign.status === EmailCampaignStatus.SENDING) {
    return c.json({ error: "Send in progress" }, 409);
  }

  let result;
  try {
    result = await sendEmailCampaign(campaign.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    if (msg.includes("paused by platform")) {
      return c.json({ error: msg }, 403);
    }
    return c.json({ error: msg }, 400);
  }

  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail,
    action: "marketing.campaign.send",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Sent campaign to ${result.sent}/${result.total} recipients`,
    meta: result,
  });

  const updated = await prisma.emailCampaign.findUnique({
    where: { id: campaign.id },
  });

  return c.json({ campaign: updated, result });
});

marketing.delete("/marketing/campaigns/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!campaign) return c.json({ error: "Not found" }, 404);
  if (campaign.status === EmailCampaignStatus.SENDING) {
    return c.json({ error: "Cannot delete while sending" }, 400);
  }

  await prisma.emailCampaign.delete({ where: { id: campaign.id } });
  return c.json({ ok: true });
});

marketing.post("/marketing/subscribers/import", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{ csv?: string }>();
  const text = String(body.csv ?? "").trim();
  if (!text) return c.json({ error: "Empty CSV" }, 400);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let imported = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i === 0 && line.toLowerCase().includes("email")) continue;
    const [emailRaw, nameRaw] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const email = emailRaw?.toLowerCase();
    if (!email || !email.includes("@")) continue;

    await prisma.emailSubscriber.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      create: {
        tenantId: tenant.id,
        email,
        name: nameRaw || null,
        source: "import",
      },
      update: { name: nameRaw || undefined, marketingOptOut: false },
    });
    imported++;
  }

  return c.json({ imported });
});

marketing.post("/marketing/automations", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{
    name?: string;
    subject?: string;
    bodyHtml?: string;
    segment?: string;
    enabled?: boolean;
    delayHours?: number;
  }>();

  const name = String(body.name ?? "").trim() || "Custom automation";
  const subject = String(body.subject ?? "").trim() || `Update from {{store_name}}`;
  const bodyHtml =
    String(body.bodyHtml ?? "").trim() ||
    "<p>Hi {{name}},</p><p>News from {{store_name}}.</p><p><a href=\"{{store_url}}\">Visit store</a></p>";
  const segmentRaw = String(body.segment ?? "ALL").toUpperCase();
  const segment = SEGMENTS.includes(segmentRaw as CampaignSegment)
    ? (segmentRaw as EmailCampaignSegment)
    : EmailCampaignSegment.ALL;

  const created = await prisma.emailAutomation.create({
    data: {
      tenantId: tenant.id,
      type: EmailAutomationType.CUSTOM,
      name,
      segment,
      subject,
      bodyHtml,
      enabled: body.enabled !== false,
      delayHours: parseInt(String(body.delayHours ?? "0"), 10) || 0,
    },
  });

  return c.json({ automation: created });
});

marketing.patch("/marketing/automations/id/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const existing = await prisma.emailAutomation.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    enabled?: boolean;
    subject?: string;
    bodyHtml?: string;
    delayHours?: number;
    name?: string;
    segment?: string | null;
  }>();

  let segment = existing.segment;
  if (body.segment !== undefined) {
    if (body.segment === null || body.segment === "") {
      segment = null;
    } else {
      const s = String(body.segment).toUpperCase();
      segment = SEGMENTS.includes(s as CampaignSegment)
        ? (s as EmailCampaignSegment)
        : existing.segment;
    }
  }

  const updated = await prisma.emailAutomation.update({
    where: { id: existing.id },
    data: {
      ...(body.enabled !== undefined ? { enabled: body.enabled === true } : {}),
      ...(body.subject !== undefined ? { subject: String(body.subject) } : {}),
      ...(body.bodyHtml !== undefined ? { bodyHtml: String(body.bodyHtml) } : {}),
      ...(body.delayHours !== undefined
        ? { delayHours: parseInt(String(body.delayHours), 10) || 0 }
        : {}),
      ...(body.name !== undefined ? { name: String(body.name).trim() || null } : {}),
      ...(body.segment !== undefined ? { segment } : {}),
    },
  });

  return c.json({ automation: updated });
});

marketing.delete("/marketing/automations/id/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const existing = await prisma.emailAutomation.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.type !== EmailAutomationType.CUSTOM) {
    return c.json({ error: "Only custom automations can be deleted" }, 400);
  }

  await prisma.emailAutomation.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});

marketing.patch("/marketing/automations/:type", async (c) => {
  const { tenant, access } = await actor(c);
  if (!hasPermission(access.permissions, "marketing")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const type = c.req.param("type").toUpperCase() as EmailAutomationType;
  if (
    !Object.values(EmailAutomationType).includes(type) ||
    type === EmailAutomationType.CUSTOM
  ) {
    return c.json({ error: "Invalid automation type" }, 400);
  }

  const body = await c.req.json<{
    enabled?: boolean;
    subject?: string;
    bodyHtml?: string;
    delayHours?: number;
    name?: string;
    segment?: string | null;
  }>();

  await ensureDefaultAutomations(tenant.id);

  const existing = await prisma.emailAutomation.findFirst({
    where: { tenantId: tenant.id, type },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const updated = await prisma.emailAutomation.update({
    where: { id: existing.id },
    data: {
      ...(body.enabled !== undefined ? { enabled: body.enabled === true } : {}),
      ...(body.subject ? { subject: body.subject } : {}),
      ...(body.bodyHtml ? { bodyHtml: body.bodyHtml } : {}),
      ...(body.delayHours !== undefined
        ? { delayHours: parseInt(String(body.delayHours), 10) || 0 }
        : {}),
    },
  });

  return c.json({ automation: updated });
});

export { marketing };
