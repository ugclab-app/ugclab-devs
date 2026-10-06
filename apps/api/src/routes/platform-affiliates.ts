import type { Hono } from "hono";
import {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  prisma,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  PLATFORM_FLAG_AFFILIATES_DISABLED,
  getPlatformFlags,
  setPlatformFlag,
} from "../lib/platform-tenant-flags.js";

export function registerPlatformAffiliatesRoutes(platform: Hono<AuthEnv>) {
  platform.get("/affiliates/summary", async (c) => {
    const [
      programsEnabled,
      activePartners,
      approvedOwed,
      paidTotal,
      commissions30d,
    ] = await Promise.all([
      prisma.affiliateProgramSettings.count({ where: { enabled: true } }),
      prisma.affiliatePartner.count({
        where: { status: AffiliatePartnerStatus.ACTIVE },
      }),
      prisma.affiliateCommission.aggregate({
        where: { status: AffiliateCommissionStatus.APPROVED },
        _sum: { commissionCents: true },
        _count: true,
      }),
      prisma.affiliateCommission.aggregate({
        where: { status: AffiliateCommissionStatus.PAID },
        _sum: { commissionCents: true },
      }),
      prisma.affiliateCommission.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const tenantsPlatformDisabled = await prisma.tenant.count({
      where: { platformFlags: { has: PLATFORM_FLAG_AFFILIATES_DISABLED } },
    });

    return c.json({
      programsEnabled,
      activePartners,
      approvedCommissionCents: approvedOwed._sum.commissionCents ?? 0,
      approvedCommissionCount: approvedOwed._count,
      paidCommissionCents: paidTotal._sum.commissionCents ?? 0,
      commissions30d,
      tenantsPlatformDisabled,
    });
  });

  platform.get("/affiliates/programs", async (c) => {
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const enabled = c.req.query("enabled") ?? "all";

    const settings = await prisma.affiliateProgramSettings.findMany({
      where:
        enabled === "yes"
          ? { enabled: true }
          : enabled === "no"
            ? { enabled: false }
            : undefined,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            owner: { select: { email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const tenantIds = settings.map((s) => s.tenantId);
    const [partnerAgg, owedAgg, orderAgg, flagRows] = await Promise.all([
      prisma.affiliatePartner.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: tenantIds }, status: AffiliatePartnerStatus.ACTIVE },
        _count: true,
      }),
      prisma.affiliateCommission.groupBy({
        by: ["tenantId"],
        where: {
          tenantId: { in: tenantIds },
          status: AffiliateCommissionStatus.APPROVED,
        },
        _sum: { commissionCents: true },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["tenantId"],
        where: {
          tenantId: { in: tenantIds },
          affiliatePartnerId: { not: null },
        },
        _count: true,
      }),
      tenantIds.length
        ? prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, platformFlags: true },
          })
        : Promise.resolve([]),
    ]);

    const partnersByTenant = new Map(partnerAgg.map((r) => [r.tenantId, r._count]));
    const owedByTenant = new Map(
      owedAgg.map((r) => [
        r.tenantId,
        { cents: r._sum.commissionCents ?? 0, count: r._count },
      ])
    );
    const ordersByTenant = new Map(orderAgg.map((r) => [r.tenantId, r._count]));
    const flagsByTenant = new Map(flagRows.map((r) => [r.id, r.platformFlags ?? []]));

    let programs = settings.map((s) => {
      const owed = owedByTenant.get(s.tenantId);
      const flags = flagsByTenant.get(s.tenantId) ?? [];
      return {
        tenantId: s.tenantId,
        tenantName: s.tenant.name,
        tenantSlug: s.tenant.slug,
        tenantStatus: s.tenant.status,
        ownerEmail: s.tenant.owner.email,
        enabled: s.enabled,
        defaultCommissionBps: s.defaultCommissionBps,
        cookieDays: s.cookieDays,
        updatedAt: s.updatedAt.toISOString(),
        activePartners: partnersByTenant.get(s.tenantId) ?? 0,
        owedCents: owed?.cents ?? 0,
        owedCount: owed?.count ?? 0,
        referralOrders: ordersByTenant.get(s.tenantId) ?? 0,
        platformDisabled: flags.includes(PLATFORM_FLAG_AFFILIATES_DISABLED),
      };
    });

    if (q) {
      programs = programs.filter(
        (p) =>
          p.tenantName.toLowerCase().includes(q) ||
          p.tenantSlug.toLowerCase().includes(q) ||
          p.ownerEmail.toLowerCase().includes(q)
      );
    }

    return c.json({ programs });
  });

  platform.get("/affiliates/programs/:tenantId", async (c) => {
    const tenantId = c.req.param("tenantId");
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        owner: { select: { email: true, name: true } },
      },
    });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    const [settings, partners, recentCommissions, platformFlags] =
      await Promise.all([
        prisma.affiliateProgramSettings.findUnique({ where: { tenantId } }),
        prisma.affiliatePartner.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            _count: { select: { commissions: true, orders: true } },
          },
        }),
        prisma.affiliateCommission.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            partner: { select: { code: true, displayName: true } },
            order: { select: { orderNumber: true } },
          },
        }),
        getPlatformFlags(tenantId),
      ]);

    const owed = await prisma.affiliateCommission.aggregate({
      where: { tenantId, status: AffiliateCommissionStatus.APPROVED },
      _sum: { commissionCents: true },
    });

    return c.json({
      tenant,
      settings: settings
        ? {
            enabled: settings.enabled,
            defaultCommissionBps: settings.defaultCommissionBps,
            cookieDays: settings.cookieDays,
            attributionModel: settings.attributionModel,
            updatedAt: settings.updatedAt.toISOString(),
          }
        : null,
      platformDisabled: platformFlags.includes(PLATFORM_FLAG_AFFILIATES_DISABLED),
      owedCents: owed._sum.commissionCents ?? 0,
      partners: partners.map((p) => ({
        id: p.id,
        code: p.code,
        displayName: p.displayName,
        email: p.email,
        status: p.status,
        commissionBps: p.commissionBps,
        orderCount: p._count.orders,
        commissionCount: p._count.commissions,
        createdAt: p.createdAt.toISOString(),
      })),
      commissions: recentCommissions.map((row) => ({
        id: row.id,
        orderNumber: row.order.orderNumber,
        partnerCode: row.partner.code,
        partnerName: row.partner.displayName,
        commissionCents: row.commissionCents,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });

  platform.patch("/affiliates/programs/:tenantId", async (c) => {
    const session = c.get("session");
    const tenantId = c.req.param("tenantId");
    const body = await c.req.json<{
      enabled?: boolean;
      platformDisabled?: boolean;
    }>();

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    if (typeof body.enabled === "boolean") {
      await prisma.affiliateProgramSettings.upsert({
        where: { tenantId },
        create: { tenantId, enabled: body.enabled },
        update: { enabled: body.enabled },
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: body.enabled ? "affiliate.program.enable" : "affiliate.program.disable",
        summary: `${tenant.slug}: affiliate program ${body.enabled ? "on" : "off"}`,
        meta: { tenantId },
      });
    }

    if (typeof body.platformDisabled === "boolean") {
      await setPlatformFlag(
        tenantId,
        PLATFORM_FLAG_AFFILIATES_DISABLED,
        body.platformDisabled
      );
      if (body.platformDisabled) {
        await prisma.affiliateProgramSettings.upsert({
          where: { tenantId },
          create: { tenantId, enabled: false },
          update: { enabled: false },
        });
      }
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: body.platformDisabled
          ? "affiliate.platform.disable"
          : "affiliate.platform.enable",
        summary: `${tenant.slug}: platform affiliate lock ${body.platformDisabled ? "on" : "off"}`,
        meta: { tenantId },
      });
    }

    return c.json({ ok: true });
  });

  platform.get("/affiliates/commissions", async (c) => {
    const tenantId = c.req.query("tenantId")?.trim();
    const status = c.req.query("status")?.trim()?.toUpperCase();
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const take = Math.min(200, Number(c.req.query("limit") ?? 100) || 100);

    const where: {
      tenantId?: string;
      status?: AffiliateCommissionStatus;
    } = {};
    if (tenantId) where.tenantId = tenantId;
    if (
      status &&
      Object.values(AffiliateCommissionStatus).includes(
        status as AffiliateCommissionStatus
      )
    ) {
      where.status = status as AffiliateCommissionStatus;
    }

    const rows = await prisma.affiliateCommission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        partner: { select: { code: true, displayName: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    });

    let commissions = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenant.name,
      tenantSlug: r.tenant.slug,
      orderNumber: r.order.orderNumber,
      partnerCode: r.partner.code,
      partnerName: r.partner.displayName,
      partnerEmail: r.partner.email,
      commissionCents: r.commissionCents,
      merchantNetCents: r.merchantNetCents,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    if (q) {
      commissions = commissions.filter(
        (r) =>
          r.tenantSlug.toLowerCase().includes(q) ||
          r.tenantName.toLowerCase().includes(q) ||
          r.partnerCode.toLowerCase().includes(q) ||
          r.partnerName.toLowerCase().includes(q) ||
          (r.partnerEmail?.toLowerCase().includes(q) ?? false) ||
          r.orderNumber.toLowerCase().includes(q)
      );
    }

    return c.json({ commissions });
  });

  platform.post("/affiliates/commissions/:id/mark-paid", async (c) => {
    const session = c.get("session");
    const body = (await c.req.json<{ payoutNote?: string }>().catch(() => ({}))) as {
      payoutNote?: string;
    };
    const row = await prisma.affiliateCommission.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!row) return c.json({ error: "Not found" }, 404);
    if (row.status === AffiliateCommissionStatus.VOID) {
      return c.json({ error: "Commission voided" }, 400);
    }
    if (row.status === AffiliateCommissionStatus.PAID) {
      return c.json({ commission: { id: row.id, status: row.status } });
    }
    const updated = await prisma.affiliateCommission.update({
      where: { id: row.id },
      data: {
        status: AffiliateCommissionStatus.PAID,
        paidAt: new Date(),
        payoutNote: body.payoutNote?.trim() || "Settled by platform admin",
      },
    });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "affiliate.commission.mark_paid",
      summary: `Commission ${row.id} marked paid (${row.commissionCents})`,
    });
    return c.json({ commission: { id: updated.id, status: updated.status } });
  });

  platform.post("/affiliates/commissions/bulk-mark-paid", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ ids?: string[]; payoutNote?: string }>();
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) return c.json({ error: "ids required" }, 400);
    const result = await prisma.affiliateCommission.updateMany({
      where: {
        id: { in: ids },
        status: AffiliateCommissionStatus.APPROVED,
      },
      data: {
        status: AffiliateCommissionStatus.PAID,
        paidAt: new Date(),
        payoutNote: body.payoutNote?.trim() || "Bulk settled by platform admin",
      },
    });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "affiliate.commission.bulk_mark_paid",
      summary: `Marked ${result.count} commissions paid`,
    });
    return c.json({ updated: result.count });
  });

  platform.get("/affiliates/partners", async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    const take = Math.min(100, Number(c.req.query("limit") ?? 50) || 50);
    if (!q || q.length < 2) {
      return c.json({ partners: [], error: "Query min 2 characters" }, 400);
    }

    const partners = await prisma.affiliatePartner.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { tenant: { slug: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    return c.json({
      partners: partners.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        tenantName: p.tenant.name,
        tenantSlug: p.tenant.slug,
        code: p.code,
        displayName: p.displayName,
        email: p.email,
        status: p.status,
        commissionBps: p.commissionBps,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  });
}
