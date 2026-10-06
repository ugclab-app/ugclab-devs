import type { Hono } from "hono";
import { EmailCampaignStatus, TenantStatus, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { countSentToday } from "../lib/email-campaigns.js";
import {
  PLATFORM_FLAG_MARKETING_PAUSED,
  getPlatformFlags,
  setPlatformFlag,
} from "../lib/platform-tenant-flags.js";
import { parseFeatureFlags } from "../lib/tenant-feature-flags.js";

const DAILY_CAP = Number(process.env.MARKETING_DAILY_CAP_PER_TENANT ?? "2000");

export function registerPlatformMarketingRoutes(platform: Hono<AuthEnv>) {
  platform.get("/marketing/summary", async (c) => {
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [sentCampaigns30d, subscribers, pausedTenants, sendingNow] =
      await Promise.all([
        prisma.emailCampaign.aggregate({
          where: {
            status: EmailCampaignStatus.SENT,
            sentAt: { gte: d30 },
          },
          _sum: { sentCount: true },
          _count: true,
        }),
        prisma.emailSubscriber.count(),
        prisma.tenant.count({
          where: { platformFlags: { has: PLATFORM_FLAG_MARKETING_PAUSED } },
        }),
        prisma.emailCampaign.count({
          where: { status: EmailCampaignStatus.SENDING },
        }),
      ]);

    return c.json({
      emailsSent30d: sentCampaigns30d._sum.sentCount ?? 0,
      campaignsSent30d: sentCampaigns30d._count,
      totalSubscribers: subscribers,
      marketingPausedTenants: pausedTenants,
      campaignsSendingNow: sendingNow,
      dailyCapPerTenant: DAILY_CAP,
    });
  });

  platform.get("/marketing/campaigns", async (c) => {
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const tenantId = c.req.query("tenantId")?.trim();
    const status = c.req.query("status")?.trim()?.toUpperCase();
    const take = Math.min(200, Number(c.req.query("limit") ?? 100) || 100);

    const where: {
      tenantId?: string;
      status?: EmailCampaignStatus;
    } = {};
    if (tenantId) where.tenantId = tenantId;
    if (
      status &&
      Object.values(EmailCampaignStatus).includes(status as EmailCampaignStatus)
    ) {
      where.status = status as EmailCampaignStatus;
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            platformFlags: true,
            featureFlags: true,
            owner: { select: { email: true } },
          },
        },
      },
    });

    let rows = campaigns.map((camp) => {
      const flags = parseFeatureFlags(camp.tenant.featureFlags);
      return {
        id: camp.id,
        tenantId: camp.tenantId,
        tenantName: camp.tenant.name,
        tenantSlug: camp.tenant.slug,
        ownerEmail: camp.tenant.owner.email,
        name: camp.name,
        subject: camp.subject,
        segment: camp.segment,
        status: camp.status,
        scheduledAt: camp.scheduledAt?.toISOString() ?? null,
        sentAt: camp.sentAt?.toISOString() ?? null,
        recipientCount: camp.recipientCount,
        sentCount: camp.sentCount,
        failedCount: camp.failedCount,
        openCount: camp.openCount,
        clickCount: camp.clickCount,
        createdAt: camp.createdAt.toISOString(),
        marketingFeatureOn: flags.marketing,
        marketingPaused: camp.tenant.platformFlags.includes(
          PLATFORM_FLAG_MARKETING_PAUSED
        ),
      };
    });

    if (q) {
      rows = rows.filter(
        (r) =>
          r.tenantSlug.toLowerCase().includes(q) ||
          r.tenantName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          (r.name?.toLowerCase().includes(q) ?? false)
      );
    }

    return c.json({ campaigns: rows });
  });

  platform.get("/marketing/tenants", async (c) => {
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const tenants = await prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        featureFlags: true,
        platformFlags: true,
        owner: { select: { email: true } },
        _count: {
          select: {
            emailCampaigns: true,
            emailSubscribers: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    let rows = await Promise.all(
      tenants.map(async (t) => {
        const flags = parseFeatureFlags(t.featureFlags);
        const sentToday = await countSentToday(t.id);
        const lastSent = await prisma.emailCampaign.findFirst({
          where: { tenantId: t.id, status: EmailCampaignStatus.SENT },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true, subject: true, sentCount: true },
        });
        return {
          tenantId: t.id,
          tenantName: t.name,
          tenantSlug: t.slug,
          ownerEmail: t.owner.email,
          marketingFeatureOn: flags.marketing,
          marketingPaused: t.platformFlags.includes(PLATFORM_FLAG_MARKETING_PAUSED),
          campaignCount: t._count.emailCampaigns,
          subscriberCount: t._count.emailSubscribers,
          sentToday,
          dailyCap: DAILY_CAP,
          lastCampaign: lastSent
            ? {
                sentAt: lastSent.sentAt?.toISOString() ?? null,
                subject: lastSent.subject,
                sentCount: lastSent.sentCount,
              }
            : null,
        };
      })
    );

    if (q) {
      rows = rows.filter(
        (r) =>
          r.tenantSlug.toLowerCase().includes(q) ||
          r.tenantName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q)
      );
    }

    return c.json({ tenants: rows });
  });

  platform.patch("/marketing/tenants/:tenantId", async (c) => {
    const session = c.get("session");
    const tenantId = c.req.param("tenantId");
    const body = await c.req.json<{
      marketingPaused?: boolean;
      marketingFeatureOn?: boolean;
    }>();

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    if (typeof body.marketingPaused === "boolean") {
      await setPlatformFlag(
        tenantId,
        PLATFORM_FLAG_MARKETING_PAUSED,
        body.marketingPaused
      );
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: body.marketingPaused
          ? "marketing.platform.pause"
          : "marketing.platform.resume",
        summary: `${tenant.slug}: marketing ${body.marketingPaused ? "paused" : "resumed"}`,
        meta: { tenantId },
      });
    }

    if (typeof body.marketingFeatureOn === "boolean") {
      const current = parseFeatureFlags(tenant.featureFlags);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          featureFlags: { ...current, marketing: body.marketingFeatureOn },
        },
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: body.marketingFeatureOn
          ? "marketing.feature.enable"
          : "marketing.feature.disable",
        summary: `${tenant.slug}: marketing feature ${body.marketingFeatureOn ? "on" : "off"}`,
        meta: { tenantId },
      });
    }

    const flags = await getPlatformFlags(tenantId);
    const featureFlags = parseFeatureFlags(
      (
        await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { featureFlags: true },
        })
      )?.featureFlags
    );

    return c.json({
      ok: true,
      marketingPaused: flags.includes(PLATFORM_FLAG_MARKETING_PAUSED),
      marketingFeatureOn: featureFlags.marketing,
    });
  });
}
