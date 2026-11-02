import type { Hono } from "hono";
import { prisma, UserRole } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requirePlatformPerm } from "../middleware/platform-perm.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { replayStripeWebhook } from "./stripe.js";
import {
  eraseBuyer,
  exportBuyer,
  getPlatformReconciliation,
  listPastDueSubscriptions,
  listPaymentErrors,
  listStaff,
  retryPastDueInvoice,
  searchBuyers,
} from "../lib/platform-desk.js";

const STAFF: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.PLATFORM_OPS, UserRole.PLATFORM_SUPPORT, UserRole.PLATFORM_FINANCE];

export function registerPlatformDeskRoutes(platform: Hono<AuthEnv>) {
  platform.get("/reconcile", requirePlatformPerm("revenue:read"), async (c) => {
    return c.json(await getPlatformReconciliation());
  });

  platform.get("/payment-errors", requirePlatformPerm("integrations:read"), async (c) => {
    return c.json(await listPaymentErrors());
  });

  platform.post("/stripe/events/:id/replay", requirePlatformPerm("integrations:read"), async (c) => {
    const session = c.get("session");
    try {
      const result = await replayStripeWebhook(c.req.param("id"));
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "stripe.replay",
        summary: `Replayed ${result.type} ${result.id}`,
      });
      return c.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Replay failed";
      return c.json({ error: message }, 400);
    }
  });

  platform.get("/billing/past-due", requirePlatformPerm("revenue:read"), async (c) => {
    return c.json({ stores: await listPastDueSubscriptions() });
  });

  platform.post("/billing/past-due/:tenantId/retry", requirePlatformPerm("payouts:write"), async (c) => {
    const session = c.get("session");
    try {
      const result = await retryPastDueInvoice(c.req.param("tenantId"));
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "billing.retry",
        summary: `Retried invoice for ${result.slug}`,
      });
      return c.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retry failed";
      return c.json({ error: message }, 400);
    }
  });

  platform.get("/buyers", requirePlatformPerm("users:read"), async (c) => {
    return c.json({ buyers: await searchBuyers(c.req.query("email") ?? "") });
  });

  platform.get("/buyers/export", requirePlatformPerm("users:gdpr"), async (c) => {
    const email = c.req.query("email") ?? "";
    if (!email.includes("@")) return c.json({ error: "email required" }, 400);
    return c.json(await exportBuyer(email));
  });

  platform.post("/buyers/erase", requirePlatformPerm("users:gdpr"), async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ email?: string }>();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return c.json({ error: "email required" }, 400);
    const result = await eraseBuyer(email);
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "buyer.erase",
      summary: `Erased buyer ${email} (${result.customers} profiles)`,
    });
    return c.json(result);
  });

  platform.get("/inbox/staff", requirePlatformPerm("inbox:read"), async (c) => {
    return c.json({ staff: await listStaff() });
  });

  platform.get("/inbox/assignments", requirePlatformPerm("inbox:read"), async (c) => {
    const rows = await prisma.platformInboxAssignment.findMany();
    return c.json({
      assignments: Object.fromEntries(rows.map((row) => [row.itemId, row.assigneeEmail])),
    });
  });

  platform.put("/inbox/:itemId/assignee", requirePlatformPerm("inbox:read"), async (c) => {
    const itemId = c.req.param("itemId").slice(0, 80);
    const body = await c.req.json<{ email?: string }>();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      await prisma.platformInboxAssignment.deleteMany({ where: { itemId } });
      return c.json({ ok: true });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user || !STAFF.includes(user.role)) return c.json({ error: "Pick a platform staff email" }, 400);
    await prisma.platformInboxAssignment.upsert({
      where: { itemId },
      create: { itemId, assigneeUserId: user.id, assigneeEmail: email },
      update: { assigneeUserId: user.id, assigneeEmail: email },
    });
    return c.json({ ok: true, email });
  });

  platform.get("/changelog", requirePlatformPerm("dashboard:read"), async (c) => {
    const rows = await prisma.platformAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return c.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });
}
