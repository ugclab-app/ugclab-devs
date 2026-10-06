import type { Hono } from "hono";
import { z } from "zod";
import {
  OrderStatus,
  PlatformPartnerStatus,
  PlatformReferralStatus,
  prisma,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { getSessionToken } from "../lib/auth-token.js";
import { resolveSession } from "../lib/session-resolve.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { sendEmail } from "../lib/email.js";
import { MERCHANT_WEB_URL } from "../env.js";
import {
  TURNOVER_COMMISSION_BPS,
  applyPlatformPartner,
  getPartnerProgram,
  markPartnerPayout,
  partnerDashboard,
  partnerSignupLink,
  readPlatformRef,
  recordPartnerClick,
  requestPartnerPayout,
  savePartnerPayoutDetails,
} from "../lib/platform-partner.js";

const applySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  pitch: z.string().min(10).max(2000),
});

export function registerPublicPartnerRoutes(routes: Hono) {
  routes.get("/partners/program", async (c) => {
    const program = await getPartnerProgram();
    return c.json({
      turnoverBps: TURNOVER_COMMISSION_BPS,
      cookieDays: program.cookieDays,
      holdDays: program.holdDays,
      minPayoutCents: program.minPayoutCents,
      promoTrialDays: program.promoTrialDays,
    });
  });

  routes.post("/partners/click", async (c) => {
    const body = await c.req.json<{ code?: string; source?: string }>().catch(() => ({}) as { code?: string; source?: string });
    const code = await recordPartnerClick(c, String(body.code ?? ""), body.source);
    return c.json({ ok: true, code });
  });

  routes.post("/partners/apply", async (c) => {
    try {
      const body = applySchema.parse(await c.req.json());
      const result = await applyPlatformPartner(body);
      if (!result.ok) return c.json({ error: result.error }, 409);
      return c.json({ ok: true, status: result.status });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json({ error: err.errors[0]?.message ?? "Invalid input" }, 400);
      }
      console.error("[partners/apply]", err);
      return c.json({ error: "Could not submit application" }, 500);
    }
  });
}

export function registerAuthPartnerRoutes(routes: Hono) {
  routes.get("/partner", async (c) => {
    const token = getSessionToken(c);
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    const session = await resolveSession(token);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const dashboard = await partnerDashboard(session.sub);
    if (!dashboard) return c.json({ partner: null });
    return c.json({ partner: dashboard });
  });

  routes.put("/partner/payout", async (c) => {
    const token = getSessionToken(c);
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    const session = await resolveSession(token);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ method?: string; details?: string }>();
    const method = String(body.method ?? "").trim();
    const details = String(body.details ?? "").trim();
    if (!method || !details) return c.json({ error: "Method and details required" }, 400);
    const saved = await savePartnerPayoutDetails(session.sub, method, details);
    if (!saved) return c.json({ error: "No partner profile" }, 404);
    return c.json(saved);
  });

  routes.post("/partner/payout-request", async (c) => {
    const token = getSessionToken(c);
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    const session = await resolveSession(token);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ currency?: string }>().catch(() => ({}) as { currency?: string });
    const result = await requestPartnerPayout(session.sub, String(body.currency ?? "USD"));
    if (!result.ok) return c.json({ error: result.error }, result.status as 400 | 403);
    return c.json({ payout: result.payout });
  });
}

export function registerPlatformPartnerAdminRoutes(platform: Hono<AuthEnv>) {
  platform.get("/platform-partners/program", async (c) => {
    return c.json(await getPartnerProgram());
  });

  platform.put("/platform-partners/program", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const keys = [
      "bountyCents",
      "feeShareBps",
      "shareMonths",
      "cookieDays",
      "holdDays",
      "minPayoutCents",
      "tierStores",
      "tierFeeShareBps",
      "promoTrialDays",
    ] as const;
    const data: Record<string, number> = {};
    for (const key of keys) {
      if (typeof body[key] === "number" && Number.isFinite(body[key])) data[key] = body[key];
    }
    const program = await prisma.platformPartnerProgram.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
    const session = c.get("session");
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "platform_partner.program",
      summary: "Updated platform partner program rates",
    });
    return c.json(program);
  });

  platform.get("/platform-partners", async (c) => {
    const partners = await prisma.platformPartner.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { clicks: true, stores: true, referrals: true } },
        stores: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            orders: {
              where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    const ids = partners.map((p) => p.id);
    const [openSums, paidSums] = ids.length
      ? await Promise.all([
          prisma.platformPartnerReferral.groupBy({
            by: ["partnerId", "currency", "status"],
            where: {
              partnerId: { in: ids },
              payoutId: null,
              status: { in: [PlatformReferralStatus.PENDING, PlatformReferralStatus.AVAILABLE] },
            },
            _sum: { amountCents: true },
          }),
          prisma.platformPartnerReferral.groupBy({
            by: ["partnerId", "currency"],
            where: { partnerId: { in: ids }, status: PlatformReferralStatus.PAID },
            _sum: { amountCents: true },
          }),
        ])
      : [[], []];

    const balances = new Map<string, Record<string, { pending: number; available: number; paid: number }>>();
    const bucket = (partnerId: string, currency: string) => {
      const row = balances.get(partnerId) ?? {};
      row[currency] = row[currency] ?? { pending: 0, available: 0, paid: 0 };
      balances.set(partnerId, row);
      return row[currency];
    };
    for (const row of openSums) {
      const cell = bucket(row.partnerId, row.currency);
      const amount = row._sum.amountCents ?? 0;
      if (row.status === PlatformReferralStatus.PENDING) cell.pending += amount;
      if (row.status === PlatformReferralStatus.AVAILABLE) cell.available += amount;
    }
    for (const row of paidSums) {
      bucket(row.partnerId, row.currency).paid += row._sum.amountCents ?? 0;
    }

    return c.json({
      partners: partners.map((p) => ({
        ...p,
        link: p.status === PlatformPartnerStatus.ACTIVE ? partnerSignupLink(p.code) : null,
        balances: balances.get(p.id) ?? {},
        stores: p.stores.map((store) => ({
          id: store.id,
          name: store.name,
          slug: store.slug,
          createdAt: store.createdAt,
          hasPaidOrder: store.orders.length > 0,
        })),
      })),
    });
  });

  platform.get("/platform-partners/referrals", async (c) => {
    const referrals = await prisma.platformPartnerReferral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        partner: { select: { name: true, email: true, code: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });
    return c.json({ referrals });
  });

  platform.get("/platform-partners/payouts", async (c) => {
    const payouts = await prisma.platformPartnerPayout.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { partner: { select: { name: true, email: true, payoutMethod: true, payoutDetails: true } } },
    });
    return c.json({ payouts });
  });

  platform.get("/platform-partners/report", async (c) => {
    const month = c.req.query("month");
    const start = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    if (!month) start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const rows = await prisma.platformPartnerReferral.groupBy({
      by: ["partnerId", "currency", "kind", "status"],
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
      _count: true,
    });
    return c.json({ from: start.toISOString(), to: end.toISOString(), rows });
  });

  platform.post("/platform-partners/:id/approve", async (c) => {
    const partner = await prisma.platformPartner.update({
      where: { id: c.req.param("id") },
      data: { status: PlatformPartnerStatus.ACTIVE },
    });
    const link = partnerSignupLink(partner.code);
    try {
      await sendEmail({
        to: partner.email,
        subject: "You’re approved as a Tescommerce partner",
        text: `Hi ${partner.name},\n\nYour partner account is active. Share this link: ${link}\nSign in at ${MERCHANT_WEB_URL}/partner`,
        html: `<p>Hi ${partner.name},</p><p>Your partner account is active. Share this link:</p><p><a href="${link}">${link}</a></p><p><a href="${MERCHANT_WEB_URL}/partner">Open your partner dashboard</a></p>`,
      });
    } catch (err) {
      console.error("[platform-partner] approve email", err);
    }
    const session = c.get("session");
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "platform_partner.approve",
      summary: `Approved partner ${partner.email}`,
    });
    return c.json({ partner, link });
  });

  platform.post("/platform-partners/:id/suspend", async (c) => {
    const partner = await prisma.platformPartner.update({
      where: { id: c.req.param("id") },
      data: { status: PlatformPartnerStatus.SUSPENDED },
    });
    const session = c.get("session");
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "platform_partner.suspend",
      summary: `Suspended partner ${partner.email}`,
    });
    return c.json({ partner });
  });

  platform.post("/platform-partners/:id/reject", async (c) => {
    const partner = await prisma.platformPartner.update({
      where: { id: c.req.param("id") },
      data: { status: PlatformPartnerStatus.REJECTED },
    });
    const session = c.get("session");
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "platform_partner.reject",
      summary: `Rejected partner ${partner.email}`,
    });
    return c.json({ partner });
  });

  platform.patch("/platform-partners/:id", async (c) => {
    const body = await c.req.json<{ feeShareBps?: number | null; bountyCents?: number | null }>();
    const data: { feeShareBps?: number | null; bountyCents?: number | null } = {};
    if ("feeShareBps" in body) data.feeShareBps = body.feeShareBps ?? null;
    if ("bountyCents" in body) data.bountyCents = body.bountyCents ?? null;
    const partner = await prisma.platformPartner.update({
      where: { id: c.req.param("id") },
      data,
    });
    return c.json({ partner });
  });

  platform.post("/platform-partners/payouts/:id/processing", async (c) => {
    const payout = await markPartnerPayout(c.req.param("id"), "PROCESSING");
    if (!payout) return c.json({ error: "Not found" }, 404);
    return c.json({ payout });
  });

  platform.post("/platform-partners/payouts/:id/paid", async (c) => {
    const payout = await markPartnerPayout(c.req.param("id"), "PAID");
    if (!payout) return c.json({ error: "Not found" }, 404);
    const session = c.get("session");
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "platform_partner.payout_paid",
      summary: `Marked partner payout ${payout.id} paid`,
    });
    return c.json({ payout });
  });
}

export function platformRefFromRequest(c: Parameters<typeof readPlatformRef>[0], bodyRef?: string | null) {
  return readPlatformRef(c, bodyRef);
}
