import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import { verifyUnsubscribeToken } from "../lib/marketing-tokens.js";

const marketingPublic = new Hono();

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

marketingPublic.get("/open/:campaignId.gif", async (c) => {
  const id = c.req.param("campaignId");
  try {
    await prisma.emailCampaign.update({
      where: { id },
      data: { openCount: { increment: 1 } },
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

  return c.html(
    `<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;text-align:center"><h1>Unsubscribed</h1><p>${data.email} will no longer receive marketing emails from this store.</p></body></html>`
  );
});

export { marketingPublic };
