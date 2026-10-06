import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import {
  verifyConfirmSubscribeToken,
  verifyUnsubscribeToken,
} from "../lib/marketing-tokens.js";

const marketingPublic = new Hono();

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

marketingPublic.get("/open/:campaignId.gif", async (c) => {
  const id = c.req.param("campaignId");
  const variant = c.req.query("v");
  try {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        openCount: { increment: 1 },
        ...(variant === "a" ? { openCountA: { increment: 1 } } : {}),
        ...(variant === "b" ? { openCountB: { increment: 1 } } : {}),
      },
    });
  } catch {
    /* ignore */
  }
  return c.body(PIXEL_GIF, 200, {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store",
  });
});

marketingPublic.get("/click/:campaignId", async (c) => {
  const id = c.req.param("campaignId");
  const url = c.req.query("u");
  if (!url) return c.text("Missing url", 400);
  try {
    await prisma.emailCampaign.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });
  } catch {
    /* ignore */
  }
  return c.redirect(decodeURIComponent(url), 302);
});

marketingPublic.get("/unsubscribe", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.text("Invalid link", 400);
  const data = verifyUnsubscribeToken(token);
  if (!data) return c.text("Link expired or invalid", 400);

  await prisma.customer.updateMany({
    where: { tenantId: data.tenantId, email: data.email },
    data: { marketingOptOut: true },
  });
  await prisma.emailSubscriber.updateMany({
    where: { tenantId: data.tenantId, email: data.email },
    data: { marketingOptOut: true },
  });

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Unsubscribed</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#18181b">
  <main style="max-width:420px;margin:10vh auto;padding:2rem;background:#fff;border:1px solid #e4e4e7;border-radius:16px;text-align:center">
    <p style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#71717a;margin:0">Email preferences</p>
    <h1 style="margin:12px 0 8px;font-size:1.5rem">You're unsubscribed</h1>
    <p style="margin:0;color:#52525b;line-height:1.5"><strong>${data.email}</strong> will no longer receive marketing emails from this store. Order and account emails may still be sent.</p>
  </main>
</body>
</html>`);
});

marketingPublic.get("/confirm-subscribe", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.text("Invalid link", 400);
  const data = verifyConfirmSubscribeToken(token);
  if (!data) return c.text("Link expired or invalid", 400);

  await prisma.emailSubscriber.updateMany({
    where: { tenantId: data.tenantId, email: data.email },
    data: {
      confirmedAt: new Date(),
      marketingOptOut: false,
      source: "newsletter",
    },
  });

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Subscribed</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#18181b">
  <main style="max-width:420px;margin:10vh auto;padding:2rem;background:#fff;border:1px solid #e4e4e7;border-radius:16px;text-align:center">
    <p style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#71717a;margin:0">Newsletter</p>
    <h1 style="margin:12px 0 8px;font-size:1.5rem">You're confirmed</h1>
    <p style="margin:0;color:#52525b;line-height:1.5"><strong>${data.email}</strong> is subscribed. Thanks for confirming.</p>
  </main>
</body>
</html>`);
});

export { marketingPublic };
