import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import { isFinikConfigured } from "../lib/finik/config.js";
import {
  finikWebhookEventId,
  handleFinikWebhook,
  parseFinikWebhook,
  verifyFinikWebhookSignature,
} from "../lib/finik/webhook.js";

export const finikRoutes = new Hono();

finikRoutes.post("/webhook", async (c) => {
  if (!isFinikConfigured()) {
    return c.text("Finik not configured", 503);
  }

  const rawBody = await c.req.text();
  const signature =
    c.req.header("signature") ?? c.req.header("Signature") ?? undefined;
  const timestamp =
    c.req.header("x-api-timestamp") ??
    c.req.header("X-Api-Timestamp") ??
    undefined;

  const url = new URL(c.req.url);
  const path = url.pathname;

  const skipVerify =
    process.env.FINIK_SKIP_WEBHOOK_VERIFY === "1" ||
    process.env.FINIK_SKIP_WEBHOOK_VERIFY === "true";

  if (!skipVerify) {
    const ok = await verifyFinikWebhookSignature({
      rawBody,
      signature,
      timestamp,
      path,
      host: c.req.header("host") ?? url.host,
      forwardedHost: c.req.header("x-forwarded-host"),
      originalHost: c.req.header("x-original-host"),
    });
    if (!ok) {
      console.warn("[finik webhook] invalid signature");
      return c.text("Invalid signature", 401);
    }
  }

  let eventId = `finik-${Date.now()}`;
  try {
    eventId = finikWebhookEventId(parseFinikWebhook(rawBody));
  } catch {
    /* use fallback id */
  }

  const existing = await prisma.finikWebhookEvent.findUnique({
    where: { id: eventId },
  });
  if (existing?.processed) {
    return c.json({ received: true, duplicate: true });
  }

  await prisma.finikWebhookEvent.upsert({
    where: { id: eventId },
    create: { id: eventId, type: "finik", processed: false },
    update: {},
  });

  try {
    await handleFinikWebhook(rawBody);
    await prisma.finikWebhookEvent.update({
      where: { id: eventId },
      data: { processed: true, error: null },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[finik webhook]", msg);
    await prisma.finikWebhookEvent.update({
      where: { id: eventId },
      data: { processed: false, error: msg },
    });
    return c.text("Handler error", 500);
  }

  return c.json({ received: true });
});
