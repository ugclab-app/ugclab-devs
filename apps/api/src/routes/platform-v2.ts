import { Hono } from "hono";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import {
  OrderStatus,
  prisma,
  TenantStatus,
  UserRole,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  getBillingHealthReport,
  getPlatformRevenueReport,
} from "../lib/platform-revenue.js";
import {
  getPlatformSettings,
  patchPlatformSettings,
} from "../lib/platform-settings.js";
import { sendPasswordResetEmail } from "../lib/user-admin-email.js";
import { getStorefrontUrl } from "../lib/storefront.js";
import { isMorPaymentModel } from "../lib/payment-model.js";

export function registerPlatformV2Routes(platform: Hono<AuthEnv>) {
  platform.get("/revenue", async (c) => {
    return c.json(await getPlatformRevenueReport());
  });

  platform.get("/billing-health", async (c) => {
    return c.json(await getBillingHealthReport());
  });

  platform.get("/disputes", async (c) => {
    const events = await prisma.orderEvent.findMany({
      where: { type: "STRIPE_DISPUTE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            currency: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    return c.json({
      disputes: events.map((e) => {
        const meta = (e.meta ?? {}) as Record<string, unknown>;
        return {
          id: e.id,
          disputeId: String(meta.disputeId ?? ""),
          tenantId: e.tenantId,
          tenantName: e.order.tenant.name,
          tenantSlug: e.order.tenant.slug,
          orderId: e.orderId,
          orderNumber: e.order.orderNumber,
          amount: Number(meta.amount ?? e.order.totalAmount),
          currency: String(meta.currency ?? e.order.currency),
          status: String(meta.status ?? "unknown"),
          reason: String(meta.reason ?? ""),
          evidenceDueBy: meta.evidenceDueBy
            ? String(meta.evidenceDueBy)
            : null,
          evidenceSubmitted: meta.evidenceSubmitted === true,
          body: e.body,
          createdAt: e.createdAt.toISOString(),
        };
      }),
    });
  });

  platform.post("/disputes/:disputeId/evidence", async (c) => {
    const disputeId = c.req.param("disputeId");
    if (!disputeId) return c.json({ error: "disputeId required" }, 400);
    const body = await c.req.json<Record<string, unknown>>();
    try {
      const { submitDisputeEvidence } = await import("../lib/stripe-disputes.js");
      const updated = await submitDisputeEvidence(disputeId, {
        customerName: body.customerName ? String(body.customerName) : undefined,
        customerEmailAddress: body.customerEmailAddress
          ? String(body.customerEmailAddress)
          : undefined,
        shippingTrackingNumber: body.shippingTrackingNumber
          ? String(body.shippingTrackingNumber)
          : undefined,
        shippingCarrier: body.shippingCarrier
          ? String(body.shippingCarrier)
          : undefined,
        shippingDocumentation: body.shippingDocumentation
          ? String(body.shippingDocumentation)
          : undefined,
        productDescription: body.productDescription
          ? String(body.productDescription)
          : undefined,
        refundPolicy: body.refundPolicy ? String(body.refundPolicy) : undefined,
        uncategorizedText: body.uncategorizedText
          ? String(body.uncategorizedText)
          : undefined,
        submit: body.submit === true,
      });
      return c.json({
        ok: true,
        status: updated.status,
        disputeId: updated.id,
      });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Evidence submit failed" },
        400
      );
    }
  });

  platform.get("/audit", async (c) => {
    const action = c.req.query("action")?.trim();
    const actor = c.req.query("actor")?.trim();
    const logs = await prisma.platformAuditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(actor
          ? { actorEmail: { contains: actor, mode: "insensitive" } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return c.json({
      logs: logs.map((l) => ({
        id: l.id,
        actorUserId: l.actorUserId,
        actorEmail: l.actorEmail,
        action: l.action,
        targetUserId: l.targetUserId,
        summary: l.summary,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  });

  platform.get("/settings", async (c) => {
    const settings = await getPlatformSettings();
    return c.json({
      settings,
      paymentModel: isMorPaymentModel() ? "mor" : "connect",
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      emailConfigured: Boolean(
        process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
      ),
      merchantAdminUrl: process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001",
      storefrontUrl: process.env.STOREFRONT_URL ?? "http://localhost:3002",
      platformOpsEmail: process.env.PLATFORM_OPS_EMAIL?.trim() || null,
    });
  });

  platform.patch("/settings", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<Record<string, unknown>>();
    const settings = await patchPlatformSettings(body as Parameters<
      typeof patchPlatformSettings
    >[0]);
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "settings.update",
      summary: "Platform settings updated",
      meta: body,
    });
    return c.json({ settings });
  });

  platform.post("/plans", async (c) => {
    const body = await c.req.json<{
      slug: string;
      name: string;
      priceMonthly: number;
      currency?: string;
      productLimit?: number | null;
      platformFeeBps?: number;
      trialDays?: number;
      stripePriceId?: string | null;
    }>();
    const slug = String(body.slug ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");
    if (!slug) return c.json({ error: "slug required" }, 400);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        slug,
        name: String(body.name ?? slug),
        priceMonthly: Math.max(0, Math.floor(Number(body.priceMonthly) || 0)),
        currency: (body.currency ?? "USD").toString().slice(0, 3).toUpperCase(),
        productLimit:
          body.productLimit === null || body.productLimit === undefined
            ? null
            : Math.floor(Number(body.productLimit)),
        platformFeeBps: Math.min(
          5000,
          Math.max(0, Math.floor(Number(body.platformFeeBps) || 500))
        ),
        trialDays: Math.max(0, Math.floor(Number(body.trialDays) || 14)),
        stripePriceId: body.stripePriceId?.trim() || null,
      },
      include: { _count: { select: { tenants: true } } },
    });
    return c.json({ plan }, 201);
  });

  platform.patch("/plans/:id", async (c) => {
    const body = await c.req.json<{
      name?: string;
      priceMonthly?: number;
      productLimit?: number | null;
      platformFeeBps?: number;
      trialDays?: number;
      stripePriceId?: string | null;
    }>();
    const plan = await prisma.subscriptionPlan.update({
      where: { id: c.req.param("id") },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.priceMonthly !== undefined
          ? { priceMonthly: Math.max(0, Math.floor(body.priceMonthly)) }
          : {}),
        ...(body.productLimit !== undefined
          ? {
              productLimit:
                body.productLimit === null
                  ? null
                  : Math.floor(Number(body.productLimit)),
            }
          : {}),
        ...(body.platformFeeBps !== undefined
          ? {
              platformFeeBps: Math.min(
                5000,
                Math.max(0, Math.floor(body.platformFeeBps))
              ),
            }
          : {}),
        ...(body.trialDays !== undefined
          ? { trialDays: Math.max(0, Math.floor(body.trialDays)) }
          : {}),
        ...(body.stripePriceId !== undefined
          ? { stripePriceId: body.stripePriceId }
          : {}),
      },
      include: { _count: { select: { tenants: true } } },
    });
    return c.json({ plan });
  });

  platform.post("/tenants", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{
      storeName: string;
      slug: string;
      ownerEmail: string;
      ownerName?: string;
      planId?: string;
      password?: string;
    }>();
    const slug = String(body.slug ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");
    const email = String(body.ownerEmail ?? "")
      .toLowerCase()
      .trim();
    if (!slug || !email || !body.storeName?.trim()) {
      return c.json({ error: "storeName, slug, ownerEmail required" }, 400);
    }

    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) return c.json({ error: "Slug taken" }, 400);

    let owner = await prisma.user.findUnique({ where: { email } });
    if (!owner) {
      const pw = body.password?.trim() || randomBytes(8).toString("hex");
      owner = await prisma.user.create({
        data: {
          email,
          name: body.ownerName?.trim() || null,
          passwordHash: await hash(pw, 12),
          role: UserRole.MERCHANT,
        },
      });
    }

    const defaultPlan =
      body.planId ??
      (await prisma.subscriptionPlan.findFirst({ orderBy: { priceMonthly: "asc" } }))
        ?.id;

    const settings = await getPlatformSettings();
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + settings.defaultTrialDays);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.storeName.trim(),
        slug,
        ownerId: owner.id,
        status: TenantStatus.ACTIVE,
        subscriptionPlanId: defaultPlan ?? null,
        trialEndsAt: trialEnds,
        settings: {
          create: {
            currency: "USD",
            primaryColor: "#7c3aed",
          },
        },
      },
      include: { owner: { select: { email: true } } },
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "tenant.create",
      summary: `Created store ${tenant.name} (${tenant.slug})`,
      meta: { tenantId: tenant.id, ownerEmail: email },
    });

    return c.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          storefrontUrl: getStorefrontUrl(tenant.slug),
        },
      },
      201
    );
  });

  platform.patch("/tenants/:id/owner", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ ownerEmail: string }>();
    const email = String(body.ownerEmail ?? "")
      .toLowerCase()
      .trim();
    if (!email) return c.json({ error: "ownerEmail required" }, 400);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: UserRole.MERCHANT,
          passwordHash: await hash(randomBytes(8).toString("hex"), 12),
        },
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id: c.req.param("id") },
      data: { ownerId: user.id },
      include: { owner: { select: { email: true, name: true } } },
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "tenant.transfer_owner",
      summary: `Transferred ${tenant.slug} to ${email}`,
      meta: { tenantId: tenant.id },
    });

    return c.json({ tenant });
  });

  platform.get("/notes", async (c) => {
    const entityType = c.req.query("entityType")?.trim();
    const entityId = c.req.query("entityId")?.trim();
    if (!entityType || !entityId) {
      return c.json({ error: "entityType and entityId required" }, 400);
    }
    const notes = await prisma.platformNote.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return c.json({
      notes: notes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  });

  platform.post("/notes", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{
      entityType: string;
      entityId: string;
      body: string;
    }>();
    if (!body.entityType || !body.entityId || !body.body?.trim()) {
      return c.json({ error: "entityType, entityId, body required" }, 400);
    }
    const note = await prisma.platformNote.create({
      data: {
        entityType: body.entityType,
        entityId: body.entityId,
        body: body.body.trim(),
        actorUserId: session.sub,
        actorEmail: session.email,
      },
    });
    return c.json({ note }, 201);
  });

  platform.get("/announcements", async (c) => {
    const items = await prisma.platformAnnouncement.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return c.json({ announcements: items });
  });

  platform.post("/announcements", async (c) => {
    const body = await c.req.json<{
      title: string;
      message: string;
      active?: boolean;
      planSlugs?: string[];
      tenantIds?: string[];
    }>();
    const item = await prisma.platformAnnouncement.create({
      data: {
        title: String(body.title ?? "").trim(),
        message: String(body.message ?? "").trim(),
        active: body.active ?? false,
        planSlugs: body.planSlugs ?? [],
        tenantIds: body.tenantIds ?? [],
      },
    });
    return c.json({ announcement: item }, 201);
  });

  platform.patch("/announcements/:id", async (c) => {
    const body = await c.req.json<{
      title?: string;
      message?: string;
      active?: boolean;
      planSlugs?: string[];
      tenantIds?: string[];
    }>();
    const item = await prisma.platformAnnouncement.update({
      where: { id: c.req.param("id") },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.message !== undefined ? { message: body.message } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.planSlugs !== undefined ? { planSlugs: body.planSlugs } : {}),
        ...(body.tenantIds !== undefined ? { tenantIds: body.tenantIds } : {}),
      },
    });
    return c.json({ announcement: item });
  });

  platform.get("/email-log", async (c) => {
    const logs = await prisma.platformEmailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return c.json({
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  });

  platform.get("/moderation", async (c) => {
    const pendingReviews = await prisma.productReview.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        product: { select: { title: true } },
      },
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
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });

  platform.post("/users/invite-admin", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ email: string; name?: string }>();
    const email = String(body.email ?? "")
      .toLowerCase()
      .trim();
    if (!email) return c.json({ error: "email required" }, 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.role === UserRole.SUPER_ADMIN) {
      return c.json({ error: "Already a super admin" }, 400);
    }

    const tempPassword = randomBytes(9).toString("base64url").slice(0, 12);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: UserRole.SUPER_ADMIN,
            passwordHash: await hash(tempPassword, 12),
            requireAdmin2fa: true,
          },
        })
      : await prisma.user.create({
          data: {
            email,
            name: body.name?.trim() || null,
            role: UserRole.SUPER_ADMIN,
            passwordHash: await hash(tempPassword, 12),
            requireAdmin2fa: true,
          },
        });

    const emailSent = await sendPasswordResetEmail({
      to: email,
      temporaryPassword: tempPassword,
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "user.invite_admin",
      targetUserId: user.id,
      summary: `Invited super admin ${email}`,
    });

    return c.json({
      user: { id: user.id, email: user.email },
      emailSent,
      temporaryPassword: emailSent ? undefined : tempPassword,
    });
  });

  platform.get("/reports/cohort", async (c) => {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        owner: { select: { email: true } },
        orders: {
          where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const d30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const rows = tenants.map((t) => {
      const firstOrder = t.orders[0];
      const gmv30d = t.orders
        .filter((o) => o.createdAt.getTime() >= d30)
        .reduce((s, o) => s + o.totalAmount, 0);
      return {
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        ownerEmail: t.owner.email,
        signedUp: t.createdAt.toISOString().slice(0, 10),
        firstOrderAt: firstOrder?.createdAt.toISOString().slice(0, 10) ?? null,
        orderCount: t.orders.length,
        gmv30d,
      };
    });

    return c.json({ cohort: rows });
  });

}
