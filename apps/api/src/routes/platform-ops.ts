import type { Hono } from "hono";
import {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  EmailCampaignStatus,
  OrderStatus,
  prisma,
  ProductStatus,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { sumOwedToCreatorsCents } from "../lib/affiliate.js";
import { countSentToday } from "../lib/email-campaigns.js";
import { getMerchantBalance } from "../lib/merchant-balance.js";
import { isMorPaymentModel } from "../lib/payment-model.js";
import {
  PLATFORM_FLAG_AFFILIATES_DISABLED,
  PLATFORM_FLAG_MARKETING_PAUSED,
} from "../lib/platform-tenant-flags.js";
import { getCatalogThemeId } from "../lib/theme-catalog.js";
import { mapPlatformDomainRow } from "../lib/custom-domain.js";
import { getStorefrontUrl } from "../lib/storefront.js";
import { getVercelDomainSslStatus } from "../lib/vercel-domains.js";
import { parseFeatureFlags } from "../lib/tenant-feature-flags.js";

const MARKETING_DAILY_CAP = Number(process.env.MARKETING_DAILY_CAP_PER_TENANT ?? "2000");

export function registerPlatformOpsRoutes(platform: Hono<AuthEnv>) {
  platform.get("/tenants/:id/ops-hub", async (c) => {
    const tenantId = c.req.param("id");
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        owner: { select: { email: true, name: true } },
        subscriptionPlan: { select: { name: true, slug: true } },
        customDomains: { orderBy: { createdAt: "desc" } },
        settings: true,
      },
    });
    if (!tenant) return c.json({ error: "Not found" }, 404);

    const platformFlags = tenant.platformFlags ?? [];
    const featureFlags = parseFeatureFlags(tenant.featureFlags);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const theme = tenant.settings?.theme as Record<string, unknown> | null;
    const themeDraft = tenant.settings?.themeDraft as Record<string, unknown> | null;
    const publishedThemeId = getCatalogThemeId(theme);
    const draftThemeId = getCatalogThemeId(themeDraft);

    const [
      webhooks,
      emails,
      unpublishedPages,
      recentProducts,
      affiliateSettings,
      activePartners,
      owedToCreatorsCents,
      referralOrders30d,
      sentToday,
      subscriberCount,
      lastCampaign,
      recentCampaigns,
      morBalance,
    ] = await Promise.all([
      prisma.stripeWebhookEvent.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.platformEmailLog.findMany({
        where: { to: tenant.owner.email },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.storePage.findMany({
        where: { tenantId, published: false },
        take: 20,
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { tenantId, status: ProductStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, slug: true, createdAt: true },
      }),
      prisma.affiliateProgramSettings.findUnique({ where: { tenantId } }),
      prisma.affiliatePartner.count({
        where: { tenantId, status: AffiliatePartnerStatus.ACTIVE },
      }),
      sumOwedToCreatorsCents(tenantId),
      prisma.order.count({
        where: {
          tenantId,
          affiliatePartnerId: { not: null },
          status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
          createdAt: { gte: d30 },
        },
      }),
      countSentToday(tenantId),
      prisma.emailSubscriber.count({ where: { tenantId } }),
      prisma.emailCampaign.findFirst({
        where: { tenantId, status: EmailCampaignStatus.SENT },
        orderBy: { sentAt: "desc" },
        select: { subject: true, sentAt: true, sentCount: true, status: true },
      }),
      prisma.emailCampaign.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          subject: true,
          status: true,
          sentCount: true,
          openCount: true,
          clickCount: true,
          createdAt: true,
        },
      }),
      isMorPaymentModel()
        ? getMerchantBalance(tenantId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const domains = await Promise.all(
      tenant.customDomains.map(async (d) => {
        const row = mapPlatformDomainRow({
          ...d,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            featureFlags: tenant.featureFlags,
            owner: { email: tenant.owner.email },
          },
        });
        let sslStatus = row.sslStatus;
        if (process.env.VERCEL_TOKEN && d.verified) {
          const v = await getVercelDomainSslStatus(d.domain);
          if (v !== "unknown") sslStatus = v;
        }
        return { ...row, sslStatus, storefrontUrl: row.storefrontUrl };
      })
    );

    const failedWebhooks = webhooks.filter((w) => !w.processed || w.error).length;

    return c.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        platformFlags,
        storefrontUrl: getStorefrontUrl(tenant.slug),
        plan: tenant.subscriptionPlan,
        owner: tenant.owner,
      },
      domains,
      theme: {
        publishedThemeId,
        draftThemeId,
        hasDraftMismatch: Boolean(
          draftThemeId && publishedThemeId && draftThemeId !== publishedThemeId
        ),
      },
      stripe: {
        accountId: tenant.stripeAccountId,
        chargesEnabled: tenant.stripeChargesEnabled,
        detailsSubmitted: tenant.stripeDetailsSubmitted,
        connected: Boolean(tenant.stripeAccountId),
      },
      webhooks: {
        failed7d: failedWebhooks,
        recent: webhooks.map((w) => ({
          id: w.id,
          type: w.type,
          processed: w.processed,
          error: w.error,
          createdAt: w.createdAt.toISOString(),
        })),
      },
      emails: {
        recent: emails.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      moderation: {
        unpublishedPages,
        recentProducts,
        platformFlags,
      },
      affiliates: {
        programEnabled: affiliateSettings?.enabled ?? false,
        defaultCommissionBps: affiliateSettings?.defaultCommissionBps ?? 1000,
        platformDisabled: platformFlags.includes(PLATFORM_FLAG_AFFILIATES_DISABLED),
        activePartners,
        owedToCreatorsCents,
        referralOrders30d,
      },
      marketing: {
        featureOn: featureFlags.marketing,
        paused: platformFlags.includes(PLATFORM_FLAG_MARKETING_PAUSED),
        sentToday,
        dailyCap: MARKETING_DAILY_CAP,
        subscriberCount,
        lastCampaign: lastCampaign
          ? {
              subject: lastCampaign.subject,
              sentAt: lastCampaign.sentAt?.toISOString() ?? null,
              sentCount: lastCampaign.sentCount,
            }
          : null,
        recentCampaigns: recentCampaigns.map((camp) => ({
          id: camp.id,
          subject: camp.subject,
          status: camp.status,
          sentCount: camp.sentCount,
          openCount: camp.openCount,
          clickCount: camp.clickCount,
          createdAt: camp.createdAt.toISOString(),
        })),
      },
      mor: morBalance
        ? {
            currency: morBalance.currency,
            availableCents: morBalance.availableCents,
            owedToCreatorsCents: morBalance.owedToCreatorsCents,
            pendingPayoutCents: morBalance.pendingPayoutCents,
            earnedCents: morBalance.earnedCents,
          }
        : null,
    });
  });

  platform.get("/moderation/queue", async (c) => {
    const [pendingReviews, flaggedProducts, draftPages, publishedPages, flaggedTenants] =
      await Promise.all([
        prisma.productReview.findMany({
          where: { approved: false },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            product: { select: { title: true } },
          },
        }),
        prisma.product.findMany({
          where: { status: ProductStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        }),
        prisma.storePage.findMany({
          where: { published: false },
          orderBy: { updatedAt: "desc" },
          take: 30,
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        }),
        prisma.storePage.findMany({
          where: { published: true },
          orderBy: { updatedAt: "desc" },
          take: 30,
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        }),
        prisma.$queryRaw<
          { id: string; name: string; slug: string; status: string; platformFlags: string[] }[]
        >`
          SELECT id, name, slug, status::text AS status, "platformFlags"
          FROM "Tenant"
          WHERE COALESCE(array_length("platformFlags", 1), 0) > 0
          LIMIT 30
        `,
      ]);

    const mapPage = (p: (typeof draftPages)[0]) => ({
      id: p.id,
      tenantId: p.tenantId,
      tenantName: p.tenant.name,
      title: p.title,
      slug: p.slug,
      updatedAt: p.updatedAt.toISOString(),
    });

    return c.json({
      pendingReviews: pendingReviews.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenant.name,
        productTitle: r.product.title,
        authorName: r.authorName,
        rating: r.rating,
        body: r.body,
      })),
      recentProducts: flaggedProducts.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        tenantName: p.tenant.name,
        title: p.title,
        slug: p.slug,
        createdAt: p.createdAt.toISOString(),
      })),
      unpublishedPages: draftPages.map(mapPage),
      publishedPages: publishedPages.map(mapPage),
      flaggedTenants,
    });
  });

  platform.patch("/tenants/:id/platform-flags", async (c) => {
    const body = await c.req.json<{ flags?: string[] }>();
    const flags = Array.isArray(body.flags)
      ? body.flags.map((f) => String(f).trim()).filter(Boolean)
      : [];
    const tenantId = c.req.param("id");
    await prisma.$executeRaw`
      UPDATE "Tenant" SET "platformFlags" = ${flags}::text[] WHERE id = ${tenantId}
    `;
    return c.json({ tenant: { id: tenantId, platformFlags: flags } });
  });

  platform.post("/moderation/pages/:id/unpublish", async (c) => {
    const page = await prisma.storePage.update({
      where: { id: c.req.param("id") },
      data: { published: false },
    });
    return c.json({ page: { id: page.id, published: page.published } });
  });
}
