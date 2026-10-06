import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { sendEmail } from "../lib/email.js";

function mapMessage(m: {
  id: string;
  tenantId: string;
  subject: string;
  body: string;
  actorUserId: string;
  actorEmail: string;
  notifyEmail: boolean;
  readAt: Date | null;
  merchantReply: string | null;
  merchantRepliedAt: Date | null;
  createdAt: Date;
  tenant?: { id: string; name: string; slug: string };
}) {
  return {
    id: m.id,
    tenantId: m.tenantId,
    tenantName: m.tenant?.name,
    tenantSlug: m.tenant?.slug,
    subject: m.subject,
    body: m.body,
    actorEmail: m.actorEmail,
    notifyEmail: m.notifyEmail,
    readAt: m.readAt?.toISOString() ?? null,
    merchantReply: m.merchantReply,
    merchantRepliedAt: m.merchantRepliedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

export function registerPlatformMerchantMessageRoutes(platform: Hono<AuthEnv>) {
  platform.get("/messages", async (c) => {
    const unreadOnly = c.req.query("hasReply") === "1";
    const rows = await prisma.platformMerchantMessage.findMany({
      where: unreadOnly ? { merchantReply: { not: null } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return c.json({ messages: rows.map(mapMessage) });
  });

  platform.get("/tenants/:id/messages", async (c) => {
    const tenantId = c.req.param("id");
    const rows = await prisma.platformMerchantMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return c.json({ messages: rows.map(mapMessage) });
  });

  platform.post("/tenants/:id/messages", async (c) => {
    const session = c.get("session");
    const tenantId = c.req.param("id");
    const body = await c.req.json<{
      subject?: string;
      body?: string;
      notifyEmail?: boolean;
    }>();
    const subject = String(body.subject ?? "").trim();
    const text = String(body.body ?? "").trim();
    if (!subject || !text) {
      return c.json({ error: "subject and body required" }, 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { owner: { select: { email: true, name: true } } },
    });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    const notifyEmail = body.notifyEmail !== false;
    const msg = await prisma.platformMerchantMessage.create({
      data: {
        tenantId,
        subject,
        body: text,
        actorUserId: session.sub,
        actorEmail: session.email,
        notifyEmail,
      },
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "merchant.message.send",
      summary: `Message to ${tenant.slug}: ${subject}`,
    });

    if (notifyEmail && tenant.owner.email) {
      try {
        await sendEmail({
          to: tenant.owner.email,
          subject: `[Platform] ${subject}`,
          html: `<p>Hi${tenant.owner.name ? ` ${tenant.owner.name}` : ""},</p>
<p>You have a message from the Tescommerce platform team about <strong>${tenant.name}</strong>:</p>
<blockquote style="border-left:3px solid #7c3aed;padding-left:12px;color:#3f3f46">${text.replace(/\n/g, "<br/>")}</blockquote>
<p><a href="${process.env.MERCHANT_WEB_URL ?? "http://localhost:3001"}/messages">Open messages in admin</a></p>
<p style="color:#71717a;font-size:12px">Sent by ${session.email}</p>`,
          text: `${subject}\n\n${text}\n\nOpen: ${(process.env.MERCHANT_WEB_URL ?? "http://localhost:3001")}/messages`,
          priority: "high",
        });
      } catch {
        /* email optional */
      }
    }

    return c.json({ message: mapMessage(msg) }, 201);
  });
}
