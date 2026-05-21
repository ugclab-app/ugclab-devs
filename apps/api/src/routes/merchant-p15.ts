import { Hono } from "hono";
import { DiscountType, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { randomBytes } from "crypto";

const p15 = new Hono<AuthEnv>();
p15.use("*", requireAuth);

// ——— Discount codes ———
p15.get("/discounts", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const discounts = await prisma.discountCode.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ discounts });
});

p15.post("/discounts", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<Record<string, unknown>>();
  const code = String(body.code ?? "")
    .trim()
    .toUpperCase();
  if (!code) return c.json({ error: "Code required" }, 400);

  const type =
    body.type === "FIXED" ? DiscountType.FIXED : DiscountType.PERCENT;
  const value =
    type === DiscountType.PERCENT
      ? parseInt(String(body.value ?? "0"), 10)
      : Math.round(parseFloat(String(body.value ?? "0")) * 100);

  if (type === DiscountType.PERCENT && (value < 1 || value > 100)) {
    return c.json({ error: "Percent must be 1–100" }, 400);
  }

  const dup = await prisma.discountCode.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code } },
  });
  if (dup) return c.json({ error: "Code already exists" }, 400);

  const discount = await prisma.discountCode.create({
    data: {
      tenantId: tenant.id,
      code,
      type,
      value,
      minOrderAmount: body.minOrderAmount
        ? Math.round(parseFloat(String(body.minOrderAmount)) * 100)
        : null,
      maxUses: body.maxUses ? parseInt(String(body.maxUses), 10) : null,
      expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
      active: body.active !== false,
    },
  });
  return c.json({ discount }, 201);
});

p15.patch("/discounts/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const existing = await prisma.discountCode.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const discount = await prisma.discountCode.update({
    where: { id: existing.id },
    data: {
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      maxUses:
        body.maxUses !== undefined
          ? body.maxUses
            ? parseInt(String(body.maxUses), 10)
            : null
          : undefined,
      expiresAt:
        body.expiresAt !== undefined
          ? body.expiresAt
            ? new Date(String(body.expiresAt))
            : null
          : undefined,
    },
  });
  return c.json({ discount });
});

p15.delete("/discounts/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const existing = await prisma.discountCode.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.discountCode.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});

// ——— Custom domains ———
p15.get("/domains", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const domains = await prisma.customDomain.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ domains, tenantSlug: tenant.slug });
});

p15.post("/domains", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { domain: raw } = await c.req.json<{ domain: string }>();
  const domain = String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!domain || !domain.includes(".")) {
    return c.json({ error: "Enter a valid domain (e.g. shop.example.com)" }, 400);
  }

  const taken = await prisma.customDomain.findUnique({ where: { domain } });
  if (taken) return c.json({ error: "Domain already registered" }, 400);

  const record = await prisma.customDomain.create({
    data: {
      tenantId: tenant.id,
      domain,
      verificationToken: `ugclab-verify-${randomBytes(8).toString("hex")}`,
    },
  });
  return c.json({ domain: record }, 201);
});

p15.post("/domains/:id/verify", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const record = await prisma.customDomain.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!record) return c.json({ error: "Not found" }, 404);

  // MVP: manual verify in admin (production: DNS TXT lookup)
  const updated = await prisma.customDomain.update({
    where: { id: record.id },
    data: { verified: true },
  });
  return c.json({ domain: updated });
});

p15.delete("/domains/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const record = await prisma.customDomain.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!record) return c.json({ error: "Not found" }, 404);
  await prisma.customDomain.delete({ where: { id: record.id } });
  return c.json({ ok: true });
});

export { p15 };
