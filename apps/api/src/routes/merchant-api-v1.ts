import { compare } from "bcryptjs";
import { Hono } from "hono";
import { OrderStatus, prisma, ProductStatus } from "@ugclab/database";
import { merchantApiOpenApiSpec } from "../lib/merchant-api-openapi.js";
import { checkRateLimit, clientIpFromHeaders } from "../lib/rate-limit.js";

/**
 * Public Merchant Admin API (API-key auth).
 * Authorization: Bearer ugc_…
 * Base: /api/v1
 */
export const merchantApiV1 = new Hono();

merchantApiV1.use("*", async (c, next) => {
  const ip = clientIpFromHeaders(c.req.raw.headers);
  const hit = checkRateLimit(`merchant-api:ip:${ip}`, {
    max: 120,
    windowMs: 60 * 1000,
  });
  if (!hit.ok) {
    c.header("Retry-After", String(hit.retryAfterSec));
    return c.json(
      { error: "Too many requests. Try again later.", retryAfterSec: hit.retryAfterSec },
      429
    );
  }
  await next();
});

type ApiKeyCtx = {
  tenantId: string;
  apiKeyId: string;
};

async function requireApiKey(
  c: import("hono").Context
): Promise<ApiKeyCtx | Response> {
  const ip = clientIpFromHeaders(c.req.raw.headers);
  const auth = c.req.header("authorization") ?? "";
  const raw = auth.startsWith("Bearer ")
    ? auth.slice(7).trim()
    : (c.req.header("x-api-key") ?? "").trim();
  if (!raw.startsWith("ugc_")) {
    const fail = checkRateLimit(`merchant-api:auth-fail:${ip}`, {
      max: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!fail.ok) {
      c.header("Retry-After", String(fail.retryAfterSec));
      return c.json(
        { error: "Too many requests. Try again later.", retryAfterSec: fail.retryAfterSec },
        429
      );
    }
    return c.json({ error: "Missing or invalid API key" }, 401);
  }
  const prefix = raw.slice(0, 12);
  const candidates = await prisma.merchantApiKey.findMany({
    where: { keyPrefix: prefix },
    take: 5,
  });
  for (const row of candidates) {
    const ok = await compare(raw, row.keyHash);
    if (ok) {
      await prisma.merchantApiKey.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      });
      // Per-key throttle for authenticated traffic
      const keyHit = checkRateLimit(`merchant-api:key:${row.id}`, {
        max: 300,
        windowMs: 60 * 1000,
      });
      if (!keyHit.ok) {
        c.header("Retry-After", String(keyHit.retryAfterSec));
        return c.json(
          {
            error: "Too many requests. Try again later.",
            retryAfterSec: keyHit.retryAfterSec,
          },
          429
        );
      }
      return { tenantId: row.tenantId, apiKeyId: row.id };
    }
  }
  const fail = checkRateLimit(`merchant-api:auth-fail:${ip}`, {
    max: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (!fail.ok) {
    c.header("Retry-After", String(fail.retryAfterSec));
    return c.json(
      { error: "Too many requests. Try again later.", retryAfterSec: fail.retryAfterSec },
      429
    );
  }
  return c.json({ error: "Invalid API key" }, 401);
}

merchantApiV1.get("/", (c) =>
  c.json({
    ok: true,
    name: "Tescommerce Merchant API",
    version: "v1",
    auth: "Bearer ugc_…",
    openapi: "/api/v1/openapi.json",
    endpoints: [
      "GET /products",
      "GET /products/:id",
      "GET /orders",
      "GET /orders/:id",
      "GET /openapi.json",
    ],
  })
);

merchantApiV1.get("/openapi.json", (c) => {
  const origin =
    process.env.API_PUBLIC_URL?.replace(/\/$/, "") || new URL(c.req.url).origin;
  return c.json(merchantApiOpenApiSpec(origin), 200, {
    "Cache-Control": "public, max-age=3600",
  });
});

merchantApiV1.get("/products", async (c) => {
  const auth = await requireApiKey(c);
  if (auth instanceof Response) return auth;
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "25", 10) || 25));
  const products = await prisma.product.findMany({
    where: { tenantId: auth.tenantId, status: { not: ProductStatus.ARCHIVED } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      type: true,
      priceAmount: true,
      compareAt: true,
      inventory: true,
      updatedAt: true,
    },
  });
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: auth.tenantId },
    select: { currency: true },
  });
  return c.json({
    products,
    currency: settings?.currency ?? "USD",
  });
});

merchantApiV1.get("/products/:id", async (c) => {
  const auth = await requireApiKey(c);
  if (auth instanceof Response) return auth;
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: auth.tenantId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 20 },
      variants: true,
    },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  return c.json({ product });
});

merchantApiV1.get("/orders", async (c) => {
  const auth = await requireApiKey(c);
  if (auth instanceof Response) return auth;
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "25", 10) || 25));
  const status = c.req.query("status")?.trim().toUpperCase();
  const orders = await prisma.order.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(status && Object.values(OrderStatus).includes(status as OrderStatus)
        ? { status: status as OrderStatus }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      tipAmount: true,
      storeCreditAmount: true,
      loyaltyDiscountAmount: true,
      customFields: true,
      currency: true,
      guestEmail: true,
      createdAt: true,
      customer: { select: { email: true, name: true } },
    },
  });
  return c.json({ orders });
});

merchantApiV1.get("/orders/:id", async (c) => {
  const auth = await requireApiKey(c);
  if (auth instanceof Response) return auth;
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: auth.tenantId },
    include: {
      items: true,
      customer: { select: { id: true, email: true, name: true } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  return c.json({ order });
});
