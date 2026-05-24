import { Hono } from "hono";
import {
  OrderStatus,
  prisma,
  ProductStatus,
  TenantStatus,
  UserAccountStatus,
  UserRole,
} from "@ugclab/database";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import type { AuthEnv } from "../middleware/session.js";
import { requirePlatformPerm } from "../middleware/platform-perm.js";
import { getPlatformInbox } from "../lib/platform-inbox.js";
import { platformGlobalSearch } from "../lib/platform-search.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  clearTenantSubscription,
  syncTenantSubscription,
} from "../lib/platform-billing.js";
import { getStripe, isStripeConfigured } from "../lib/stripe.js";
import { syncOrderFromStripe } from "../lib/stripe-order-sync.js";
import { sendPasswordResetEmail } from "../lib/user-admin-email.js";
import { sendEmail } from "../lib/email.js";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "../lib/tenant-feature-flags.js";
import { isPlatformStaff } from "../lib/platform-permissions.js";

function audit(
  c: { get: (k: "session") => AuthEnv["Variables"]["session"] },
  action: string,
  summary: string,
  meta?: Record<string, unknown>
) {
  const session = c.get("session");
  return logPlatformAudit({
    actorUserId: session.sub,
    actorEmail: session.email,
    action,
    summary,
    meta,
  });
}

export function registerPlatformV3Routes(platform: Hono<AuthEnv>) {
  platform.get("/inbox", async (c) => {
    const data = await getPlatformInbox();
    return c.json(data);
  });

  platform.get("/search", requirePlatformPerm("search:read"), async (c) => {
    const q = c.req.query("q") ?? "";
    return c.json(await platformGlobalSearch(q));
  });

  platform.get(
    "/stripe/events",
    requirePlatformPerm("integrations:read"),
    async (c) => {
      const events = await prisma.stripeWebhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return c.json({
        events: events.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
          stripeDashboardUrl: e.id.startsWith("evt_")
            ? `https://dashboard.stripe.com/events/${e.id}`
            : null,
        })),
        stripeConfigured: isStripeConfigured(),
      });
    }
  );

  platform.post(
    "/stripe/resync-order/:orderId",
    requirePlatformPerm("integrations:read"),
    async (c) => {
      if (!isStripeConfigured()) {
        return c.json({ error: "Stripe not configured" }, 503);
      }
      try {
        await syncOrderFromStripe(c.req.param("orderId"));
        await audit(c, "stripe.resync_order", `Resynced order ${c.req.param("orderId")}`);
        return c.json({ ok: true });
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : "Sync failed" }, 400);
      }
    }
  );

  platform.post(
    "/stripe/resync-subscription/:tenantId",
    requirePlatformPerm("integrations:read"),
    async (c) => {
      if (!isStripeConfigured()) {
        return c.json({ error: "Stripe not configured" }, 503);
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: c.req.param("tenantId") },
      });
      if (!tenant?.stripeSubscriptionId) {
        return c.json({ error: "No subscription on tenant" }, 400);
      }
      const sub = await getStripe().subscriptions.retrieve(tenant.stripeSubscriptionId);
      await syncTenantSubscription(sub);
      await audit(c, "stripe.resync_subscription", `Resynced sub for ${tenant.slug}`);
      return c.json({ ok: true });
    }
  );

  platform.patch(
    "/moderation/reviews/:id",
    requirePlatformPerm("moderation:write"),
    async (c) => {
      const body = await c.req.json<{ approved?: boolean }>();
      const review = await prisma.productReview.update({
        where: { id: c.req.param("id") },
        data: { approved: body.approved === true },
      });
      await audit(c, "moderation.review", `Review ${review.id} approved=${body.approved}`);
      return c.json({ review });
    }
  );

  platform.post(
    "/moderation/products/:id/ban",
    requirePlatformPerm("moderation:write"),
    async (c) => {
      const product = await prisma.product.update({
        where: { id: c.req.param("id") },
        data: { status: ProductStatus.ARCHIVED },
      });
      await audit(c, "moderation.product_ban", `Archived product ${product.id}`);
      return c.json({ product: { id: product.id, status: product.status } });
    }
  );

  platform.patch(
    "/tenants/:id/billing",
    requirePlatformPerm("tenants:write"),
    async (c) => {
      const body = await c.req.json<{
        planId?: string | null;
        extendTrialDays?: number;
        cancelSubscription?: boolean;
        creditCents?: number;
      }>();
      const tenant = await prisma.tenant.findUnique({
        where: { id: c.req.param("id") },
        include: { owner: true },
      });
      if (!tenant) return c.json({ error: "Not found" }, 404);

      const data: Record<string, unknown> = {};

      if (body.planId !== undefined) {
        data.subscriptionPlanId = body.planId;
      }
      if (typeof body.extendTrialDays === "number" && body.extendTrialDays > 0) {
        const base = tenant.trialEndsAt ?? new Date();
        data.trialEndsAt = new Date(
          Math.max(base.getTime(), Date.now()) + body.extendTrialDays * 86400000
        );
      }
      if (body.cancelSubscription) {
        if (tenant.stripeSubscriptionId && isStripeConfigured()) {
          await getStripe().subscriptions.cancel(tenant.stripeSubscriptionId);
        }
        await clearTenantSubscription(tenant.id);
      }
      if (typeof body.creditCents === "number") {
        data.platformCreditCents = { increment: Math.round(body.creditCents) };
      }

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data,
      });
      await audit(c, "tenant.billing", `Billing update ${tenant.slug}`, body);
      return c.json({ tenant: updated });
    }
  );

  platform.get("/tenants/:id/features", async (c) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: c.req.param("id") },
      select: { id: true, featureFlags: true },
    });
    if (!tenant) return c.json({ error: "Not found" }, 404);
    return c.json({
      flags: parseFeatureFlags(tenant.featureFlags),
      defaults: DEFAULT_FEATURE_FLAGS,
    });
  });

  platform.patch(
    "/tenants/:id/features",
    requirePlatformPerm("tenants:write"),
    async (c) => {
      const body = await c.req.json<Record<string, boolean>>();
      const tenant = await prisma.tenant.findUnique({
        where: { id: c.req.param("id") },
      });
      if (!tenant) return c.json({ error: "Not found" }, 404);
      const flags = { ...parseFeatureFlags(tenant.featureFlags), ...body };
      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { featureFlags: flags },
      });
      await audit(c, "tenant.features", `Feature flags ${tenant.slug}`, flags);
      return c.json({ flags: parseFeatureFlags(updated.featureFlags) });
    }
  );

  platform.get("/blacklist", requirePlatformPerm("blacklist:write"), async (c) => {
    const entries = await prisma.platformBlacklistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return c.json({
      entries: entries.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  });

  platform.post("/blacklist", requirePlatformPerm("blacklist:write"), async (c) => {
    const body = await c.req.json<{ type: string; value: string; reason?: string }>();
    const type = body.type === "domain" ? "domain" : "email";
    const value = String(body.value ?? "").toLowerCase().trim();
    if (!value) return c.json({ error: "value required" }, 400);
    const entry = await prisma.platformBlacklistEntry.create({
      data: { type, value, reason: body.reason?.trim() || null },
    });
    await audit(c, "blacklist.add", `Blacklisted ${type} ${value}`);
    return c.json({ entry });
  });

  platform.delete(
    "/blacklist/:id",
    requirePlatformPerm("blacklist:write"),
    async (c) => {
      await prisma.platformBlacklistEntry.delete({ where: { id: c.req.param("id") } });
      return c.json({ ok: true });
    }
  );

  platform.post(
    "/tenants/bulk-suspend",
    requirePlatformPerm("tenants:bulk"),
    async (c) => {
      const body = await c.req.json<{ tenantIds: string[] }>();
      const ids = Array.isArray(body.tenantIds) ? body.tenantIds.slice(0, 100) : [];
      const r = await prisma.tenant.updateMany({
        where: { id: { in: ids } },
        data: { status: TenantStatus.SUSPENDED },
      });
      await audit(c, "tenants.bulk_suspend", `Suspended ${r.count} stores`);
      return c.json({ count: r.count });
    }
  );

  platform.post(
    "/tenants/bulk-email",
    requirePlatformPerm("tenants:bulk"),
    async (c) => {
      const body = await c.req.json<{
        tenantIds: string[];
        subject: string;
        html: string;
      }>();
      const ids = Array.isArray(body.tenantIds) ? body.tenantIds.slice(0, 50) : [];
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: ids } },
        include: { owner: true },
      });
      let sent = 0;
      for (const t of tenants) {
        try {
          await sendEmail({
            to: t.owner.email,
            subject: body.subject,
            html: body.html,
            template: "bulk-ops",
          });
          sent++;
        } catch {
          /* skip */
        }
      }
      await audit(c, "tenants.bulk_email", `Bulk email to ${sent}/${tenants.length} owners`);
      return c.json({ sent, total: tenants.length });
    }
  );

  platform.patch(
    "/plans/:id/archive",
    requirePlatformPerm("plans:write"),
    async (c) => {
      const body = await c.req.json<{ archived?: boolean }>();
      const plan = await prisma.subscriptionPlan.update({
        where: { id: c.req.param("id") },
        data: { archived: body.archived !== false },
      });
      await audit(c, "plan.archive", `Plan ${plan.slug} archived=${plan.archived}`);
      return c.json({ plan });
    }
  );

  platform.post(
    "/plans/:id/migrate",
    requirePlatformPerm("plans:write"),
    async (c) => {
      const body = await c.req.json<{ targetPlanId: string; tenantIds?: string[] }>();
      const sourcePlanId = c.req.param("id");
      const where =
        body.tenantIds?.length ?
          { id: { in: body.tenantIds }, subscriptionPlanId: sourcePlanId }
        : { subscriptionPlanId: sourcePlanId };
      const r = await prisma.tenant.updateMany({
        where,
        data: { subscriptionPlanId: body.targetPlanId },
      });
      await audit(c, "plan.migrate", `Migrated ${r.count} tenants to plan ${body.targetPlanId}`);
      return c.json({ count: r.count });
    }
  );

  platform.get(
    "/analytics/retention",
    requirePlatformPerm("revenue:read"),
    async (c) => {
      const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const tenants = await prisma.tenant.findMany({
        where: { createdAt: { gte: d90 } },
        select: {
          id: true,
          slug: true,
          name: true,
          createdAt: true,
          orders: {
            where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true, totalAmount: true },
          },
          _count: {
            select: {
              orders: {
                where: {
                  status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
                  createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
              },
            },
          },
        },
        take: 200,
      });
      const cohort = tenants.map((t) => ({
        tenantId: t.id,
        slug: t.slug,
        name: t.name,
        signedUp: t.createdAt.toISOString(),
        firstOrderAt: t.orders[0]?.createdAt.toISOString() ?? null,
        orders30d: t._count.orders,
        retained: t._count.orders > 0,
      }));
      const signedUp = cohort.length;
      const withOrder = cohort.filter((x) => x.firstOrderAt).length;
      const retained = cohort.filter((x) => x.retained).length;
      return c.json({
        summary: {
          signedUp90d: signedUp,
          activatedPct: signedUp ? Math.round((withOrder / signedUp) * 100) : 0,
          retained30dPct: signedUp ? Math.round((retained / signedUp) * 100) : 0,
        },
        cohort,
      });
    }
  );

  platform.get("/audit/export.csv", requirePlatformPerm("audit:read"), async (c) => {
    const logs = await prisma.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const header = "createdAt,actorEmail,action,summary\n";
    const rows = logs
      .map(
        (l) =>
          `${l.createdAt.toISOString()},${JSON.stringify(l.actorEmail)},${l.action},${JSON.stringify(l.summary)}`
      )
      .join("\n");
    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="audit.csv"',
      },
    });
  });

  platform.get(
    "/users/:id/gdpr-export",
    requirePlatformPerm("users:gdpr"),
    async (c) => {
      const user = await prisma.user.findUnique({
        where: { id: c.req.param("id") },
        include: {
          tenants: { select: { id: true, slug: true, name: true } },
          tenantMembers: { include: { tenant: { select: { slug: true } } } },
        },
      });
      if (!user) return c.json({ error: "Not found" }, 404);
      return c.json({
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        ownedStores: user.tenants,
        memberships: user.tenantMembers.map((m) => m.tenant.slug),
      });
    }
  );

  platform.post(
    "/users/:id/gdpr-delete",
    requirePlatformPerm("users:gdpr"),
    async (c) => {
      const id = c.req.param("id");
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return c.json({ error: "Not found" }, 404);
      if (isPlatformStaff(user.role)) {
        return c.json({ error: "Cannot delete platform staff" }, 400);
      }
      const anon = `deleted-${id.slice(0, 8)}@gdpr.local`;
      await prisma.user.update({
        where: { id },
        data: {
          email: anon,
          name: "Deleted user",
          passwordHash: null,
          accountStatus: UserAccountStatus.BANNED,
          bannedAt: new Date(),
          sessionVersion: { increment: 1 },
          totpSecret: null,
          totpEnabled: false,
        },
      });
      await audit(c, "user.gdpr_delete", `GDPR delete ${user.email}`);
      return c.json({ ok: true });
    }
  );

  platform.post("/users/invite-staff", requirePlatformPerm("staff:invite"), async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{
      email: string;
      name?: string;
      role: string;
    }>();
    const email = String(body.email ?? "").toLowerCase().trim();
    const role = String(body.role ?? "") as UserRole;
    const allowed: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.PLATFORM_OPS,
      UserRole.PLATFORM_SUPPORT,
      UserRole.PLATFORM_FINANCE,
    ];
    if (!email || !allowed.includes(role)) {
      return c.json({ error: "Invalid email or role" }, 400);
    }

    const tempPassword = randomBytes(9).toString("base64url").slice(0, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            role,
            passwordHash: await hash(tempPassword, 12),
            requireAdmin2fa: true,
          },
        })
      : await prisma.user.create({
          data: {
            email,
            name: body.name?.trim() || null,
            role,
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
      action: "user.invite_staff",
      targetUserId: user.id,
      summary: `Invited ${role} ${email}`,
    });
    return c.json({
      user: { id: user.id, email: user.email, role: user.role },
      emailSent,
      temporaryPassword: emailSent ? undefined : tempPassword,
    });
  });
}
