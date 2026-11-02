import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requirePlatformPerm } from "../middleware/platform-perm.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  emailConfigured,
  isMailboxStatus,
  loadMailboxAttachment,
  mailboxWebhookConfigured,
  mapMessage,
  mapThread,
  platformMailboxAddress,
  platformMailboxAliases,
  platformMailForwardTo,
  sendMailboxMessage,
  storesForMailboxEmail,
} from "../lib/platform-mailbox.js";

const REPLIES = [
  {
    label: "Payout sent",
    body: "Your payout was sent through Wise. It usually arrives within 3–7 business days after approval. The minimum is $50.",
  },
  {
    label: "Store in review",
    body: "Your store is in review. We will email you here when it is approved.",
  },
  {
    label: "Need the order",
    body: "Reply with the order number and the email used at checkout, and we will look it up.",
  },
];

export function registerPlatformMailboxRoutes(platform: Hono<AuthEnv>) {
  platform.get("/mailbox", requirePlatformPerm("inbox:read"), async (c) => {
    const q = c.req.query("q")?.trim() ?? "";
    const includeClosed = c.req.query("closed") === "1";
    const threads = await prisma.platformMailboxThread.findMany({
      where: {
        ...(includeClosed ? {} : { status: { not: "closed" } }),
        ...(q
          ? {
              OR: [
                { subject: { contains: q, mode: "insensitive" } },
                { correspondentEmail: { contains: q, mode: "insensitive" } },
                { correspondentName: { contains: q, mode: "insensitive" } },
                { messages: { some: { textBody: { contains: q, mode: "insensitive" } } } },
                { notes: { some: { body: { contains: q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: 80,
    });
    const address = platformMailboxAddress();
    return c.json({
      address: { email: address.email, from: address.fromHeader },
      aliases: platformMailboxAliases(),
      forwardTo: platformMailForwardTo(),
      emailConfigured: emailConfigured(),
      receivingConfigured: Boolean(process.env.RESEND_API_KEY?.trim()) && mailboxWebhookConfigured(),
      replies: REPLIES,
      threads: threads.map(mapThread),
    });
  });

  platform.get(
    "/mailbox/messages/:messageId/attachments/:attachmentId",
    requirePlatformPerm("inbox:read"),
    async (c) => {
      try {
        const file = await loadMailboxAttachment(c.req.param("messageId"), c.req.param("attachmentId"));
        if (!file) return c.json({ error: "Attachment not found" }, 404);
        return new Response(new Uint8Array(file.bytes), {
          headers: {
            "Content-Type": file.contentType,
            "Content-Disposition": `attachment; filename="${file.filename}"`,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not download";
        return c.json({ error: message }, 502);
      }
    }
  );

  platform.get("/mailbox/:id", requirePlatformPerm("inbox:read"), async (c) => {
    const id = c.req.param("id");
    const thread = await prisma.platformMailboxThread.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!thread) return c.json({ error: "Conversation not found" }, 404);
    if (thread.unread) {
      await prisma.platformMailboxThread.update({ where: { id }, data: { unread: false } });
    }
    const stores = await storesForMailboxEmail(thread.correspondentEmail);
    return c.json({
      thread: mapThread({ ...thread, unread: false }),
      messages: thread.messages.map(mapMessage),
      notes: thread.notes.map((note) => ({
        id: note.id,
        body: note.body,
        actorEmail: note.actorEmail,
        createdAt: note.createdAt.toISOString(),
      })),
      stores,
    });
  });

  platform.patch("/mailbox/:id", requirePlatformPerm("mailbox:write"), async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{ status?: string }>();
    const status = String(body.status ?? "");
    if (!isMailboxStatus(status)) return c.json({ error: "Status must be open, waiting, or closed" }, 400);
    const existing = await prisma.platformMailboxThread.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return c.json({ error: "Conversation not found" }, 404);
    await prisma.platformMailboxThread.update({
      where: { id },
      data: { status, ...(status === "closed" ? { unread: false } : {}) },
    });
    return c.json({ ok: true, status });
  });

  platform.post("/mailbox/:id/notes", requirePlatformPerm("mailbox:write"), async (c) => {
    const session = c.get("session");
    const id = c.req.param("id");
    const body = await c.req.json<{ body?: string }>();
    const text = String(body.body ?? "").trim();
    if (!text) return c.json({ error: "Write a note" }, 400);
    if (text.length > 4000) return c.json({ error: "Note is too long" }, 400);
    const thread = await prisma.platformMailboxThread.findUnique({ where: { id }, select: { id: true } });
    if (!thread) return c.json({ error: "Conversation not found" }, 404);
    const note = await prisma.platformMailboxNote.create({
      data: { threadId: id, body: text, actorUserId: session.sub, actorEmail: session.email },
    });
    return c.json({
      note: {
        id: note.id,
        body: note.body,
        actorEmail: note.actorEmail,
        createdAt: note.createdAt.toISOString(),
      },
    }, 201);
  });

  platform.post("/mailbox", requirePlatformPerm("mailbox:write"), async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ to?: string; subject?: string; body?: string }>();
    try {
      const threadId = await sendMailboxMessage({
        to: String(body.to ?? ""),
        subject: String(body.subject ?? ""),
        body: String(body.body ?? ""),
        actorUserId: session.sub,
        actorEmail: session.email,
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "mailbox.send",
        summary: `Mailbox email to ${String(body.to ?? "").trim()}`,
      });
      return c.json({ threadId }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send";
      const status = /not configured/i.test(message) ? 503 : 400;
      return c.json({ error: message }, status);
    }
  });

  platform.post("/mailbox/:id/reply", requirePlatformPerm("mailbox:write"), async (c) => {
    const session = c.get("session");
    const id = c.req.param("id");
    const body = await c.req.json<{ body?: string }>();
    try {
      const threadId = await sendMailboxMessage({
        to: "",
        subject: "",
        body: String(body.body ?? ""),
        threadId: id,
        actorUserId: session.sub,
        actorEmail: session.email,
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "mailbox.reply",
        summary: `Mailbox reply in ${threadId}`,
      });
      return c.json({ threadId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send";
      const status = /not found/i.test(message) ? 404 : /not configured/i.test(message) ? 503 : 400;
      return c.json({ error: message }, status);
    }
  });
}
