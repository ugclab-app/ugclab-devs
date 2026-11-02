import { Hono } from "hono";
import { fetchReceivedEmail, ingestInboundEmail, parseEmailAddress } from "../lib/platform-mailbox.js";
import { verifyResendWebhook } from "../lib/resend-webhook.js";

export const resendWebhook = new Hono();

resendWebhook.post("/webhook", async (c) => {
  const payload = await c.req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
  const id = c.req.header("svix-id") ?? c.req.header("webhook-id") ?? "";
  const timestamp = c.req.header("svix-timestamp") ?? c.req.header("webhook-timestamp") ?? "";
  const signature = c.req.header("svix-signature") ?? c.req.header("webhook-signature") ?? "";

  if (secret) {
    const ok = verifyResendWebhook({ payload, id, timestamp, signature, secret });
    if (!ok) return c.json({ error: "Invalid webhook signature" }, 401);
  } else if (process.env.NODE_ENV === "production") {
    return c.json({ error: "RESEND_WEBHOOK_SECRET is not configured" }, 503);
  }

  let event: {
    type?: string;
    data?: {
      email_id?: string;
      from?: string;
      to?: string[];
      subject?: string;
      message_id?: string;
      attachments?: Array<{ id?: string; filename?: string }>;
    };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (event.type !== "email.received") return c.json({ ok: true, ignored: true });

  const emailId = event.data?.email_id?.trim();
  if (!emailId) return c.json({ error: "email_id missing" }, 400);

  try {
    const email = await fetchReceivedEmail(emailId);
    if (!email) {
      const from = parseEmailAddress(event.data?.from ?? "");
      await ingestInboundEmail({
        resendEmailId: emailId,
        from: from.email,
        to: event.data?.to ?? [],
        subject: event.data?.subject ?? "",
        text: "(message body was not loaded — RESEND_API_KEY missing)",
        html: null,
        messageId: event.data?.message_id ?? null,
        inReplyTo: null,
        references: null,
        attachmentNames: (event.data?.attachments ?? [])
          .map((item) => item.filename)
          .filter((name): name is string => Boolean(name)),
        attachmentMeta: (event.data?.attachments ?? []).flatMap((item) => {
          if (!item.filename) return [];
          return [{ id: item.id ?? "", filename: item.filename }];
        }),
      });
      return c.json({ ok: true, partial: true });
    }
    await ingestInboundEmail(email);
    return c.json({ ok: true });
  } catch (err) {
    console.error("[resend webhook]", err);
    return c.json({ error: "Could not store inbound email" }, 500);
  }
});
