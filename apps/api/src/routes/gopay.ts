import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import { isGoPayConfigured } from "../lib/gopay/config.js";
import {
  handleGoPayWebhook,
  verifyGoPayWebhookRequest,
} from "../lib/gopay/webhook.js";

export const gopayRoutes = new Hono();

gopayRoutes.post("/webhook", async (c) => {
  if (!isGoPayConfigured()) {
    return c.text("GoPay not configured", 503);
  }

  const rawBody = await c.req.text();
  const nonce =
    c.req.header("GoPay-Nonce") ?? c.req.header("gopay-nonce") ?? undefined;
  const signature =
    c.req.header("GoPay-Signature") ??
    c.req.header("gopay-signature") ??
    undefined;

  if (!verifyGoPayWebhookRequest(rawBody, { nonce, signature })) {
    console.warn("[gopay webhook] invalid signature");
    return c.text("Invalid signature", 401);
  }

  let eventId = `${nonce ?? "n"}-${signature?.slice(0, 16) ?? "x"}`;
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: { payment_id?: string };
      payment_id?: string;
    };
    const pid = parsed.data?.payment_id ?? parsed.payment_id;
    if (pid) eventId = pid;
  } catch {
    /* use composite id */
  }

  const existing = await prisma.gopayWebhookEvent.findUnique({
    where: { id: eventId },
  });
  if (existing?.processed) {
    return c.json({ received: true, duplicate: true });
  }

  await prisma.gopayWebhookEvent.upsert({
    where: { id: eventId },
    create: { id: eventId, type: "gopay", processed: false },
    update: {},
  });

  try {
    await handleGoPayWebhook(rawBody);
    await prisma.gopayWebhookEvent.update({
      where: { id: eventId },
      data: { processed: true, error: null },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[gopay webhook]", msg);
    await prisma.gopayWebhookEvent.update({
      where: { id: eventId },
      data: { processed: false, error: msg },
    });
    return c.text("Handler error", 500);
  }

  return c.json({ received: true });
});
