import { Hono } from "hono";
import { DiscountType, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { normalizeSlug, requireTenant } from "../lib/merchant.js";
import {
  isDomainBlacklisted,
  newVerificationToken,
  normalizeDomainInput,
} from "../lib/custom-domain.js";
import { dnsInstructions } from "../lib/custom-domain-dns.js";
import {
  getDomainShopConfig,
  getPurchaseLinksForDomain,
  searchDomains,
} from "../lib/domain-shop.js";
import { verifyMerchantDomainDns } from "../lib/merchant-domain-verify.js";
import { assertTenantCanAddDomain } from "../lib/platform-domain-policy.js";

import { useOwnerOnlyDomainGuards } from "../middleware/merchant-guards.js";

const p15 = new Hono<AuthEnv>();
p15.use("*", requireAuth);
useOwnerOnlyDomainGuards(p15);

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
      startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
      collectionId: body.collectionId ? String(body.collectionId) : null,
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
      startsAt:
        body.startsAt !== undefined
          ? body.startsAt
            ? new Date(String(body.startsAt))
            : null
          : undefined,
      collectionId:
        body.collectionId !== undefined
          ? body.collectionId
            ? String(body.collectionId)
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
p15.get("/domains/config", async (c) => {
  await requireTenant(c.get("session"));
  return c.json(getDomainShopConfig());
});

p15.get("/domains/search", async (c) => {
  await requireTenant(c.get("session"));
  const q = c.req.query("q") ?? "";
  try {
    const data = await searchDomains(String(q));
    return c.json(data);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      500
    );
  }
});

p15.get("/domains/purchase-links", async (c) => {
  await requireTenant(c.get("session"));
  const domain = String(c.req.query("domain") ?? "");
  return c.json(getPurchaseLinksForDomain(domain));
});

const RESERVED_HANDLES = new Set([
  "api",
  "admin",
  "platform",
  "assets",
  "www",
  "health",
  "storefront",
  "app",
]);
const MAX_STORE_ALIASES = 8;

function parseStoreHandle(raw: string): { slug: string } | { error: string } {
  const slug = normalizeSlug(String(raw ?? "")).slice(0, 48);
  if (slug.length < 2) return { error: "Use at least 2 letters or numbers" };
  if (RESERVED_HANDLES.has(slug)) return { error: "This address is reserved" };
  return { slug };
}

async function storeHandleTaken(slug: string, tenantId: string) {
  const other = await prisma.tenant.findFirst({
    where: { slug, NOT: { id: tenantId } },
    select: { id: true },
  });
  if (other) return true;
  const alias = await prisma.storeSettings.findFirst({
    where: { storeAliases: { has: slug }, NOT: { tenantId } },
    select: { tenantId: true },
  });
  return Boolean(alias);
}

p15.get("/domains", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const domains = await prisma.customDomain.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { storeAliases: true },
  });
  return c.json({
    domains,
    tenantSlug: tenant.slug,
    aliases: settings?.storeAliases ?? [],
    config: getDomainShopConfig(),
  });
});

p15.patch("/domains/slug", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ slug?: string }>();
  const parsed = parseStoreHandle(String(body.slug ?? ""));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);
  if (parsed.slug === tenant.slug) return c.json({ slug: tenant.slug });
  if (await storeHandleTaken(parsed.slug, tenant.id)) {
    return c.json({ error: "This address is already taken" }, 400);
  }
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { storeAliases: true },
  });
  const current = settings?.storeAliases ?? [];
  const withoutNew = current.filter((item) => item !== parsed.slug);
  const aliases = [tenant.slug, ...withoutNew.filter((item) => item !== tenant.slug)].slice(
    0,
    MAX_STORE_ALIASES
  );
  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenant.id }, data: { slug: parsed.slug } }),
    prisma.storeSettings.upsert({
      where: { tenantId: tenant.id },
      update: { storeAliases: aliases },
      create: { tenantId: tenant.id, storeAliases: aliases },
    }),
  ]);
  return c.json({ slug: parsed.slug, aliases });
});

p15.post("/domains/aliases", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ slug?: string }>();
  const parsed = parseStoreHandle(String(body.slug ?? ""));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);
  if (parsed.slug === tenant.slug) {
    return c.json({ error: "This is already the main address" }, 400);
  }
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { storeAliases: true },
  });
  const current = settings?.storeAliases ?? [];
  if (current.includes(parsed.slug)) return c.json({ aliases: current });
  if (current.length >= MAX_STORE_ALIASES) {
    return c.json({ error: "You can add up to 8 extra addresses" }, 400);
  }
  if (await storeHandleTaken(parsed.slug, tenant.id)) {
    return c.json({ error: "This address is already taken" }, 400);
  }
  const aliases = [...current, parsed.slug];
  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    update: { storeAliases: aliases },
    create: { tenantId: tenant.id, storeAliases: aliases },
  });
  return c.json({ aliases }, 201);
});

p15.patch("/domains/aliases", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ from?: string; to?: string }>();
  const from = parseStoreHandle(String(body.from ?? ""));
  const to = parseStoreHandle(String(body.to ?? ""));
  if ("error" in from) return c.json({ error: from.error }, 400);
  if ("error" in to) return c.json({ error: to.error }, 400);
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { storeAliases: true },
  });
  const current = settings?.storeAliases ?? [];
  if (!current.includes(from.slug)) return c.json({ error: "Address not found" }, 404);
  if (to.slug === tenant.slug || (current.includes(to.slug) && to.slug !== from.slug)) {
    return c.json({ error: "This address is already on your store" }, 400);
  }
  if (to.slug !== from.slug && (await storeHandleTaken(to.slug, tenant.id))) {
    return c.json({ error: "This address is already taken" }, 400);
  }
  const aliases = current.map((item) => (item === from.slug ? to.slug : item));
  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    update: { storeAliases: aliases },
    create: { tenantId: tenant.id, storeAliases: aliases },
  });
  return c.json({ aliases });
});

p15.delete("/domains/aliases", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ slug?: string }>();
  const slug = normalizeSlug(String(body.slug ?? ""));
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { storeAliases: true },
  });
  const aliases = (settings?.storeAliases ?? []).filter((item) => item !== slug);
  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    update: { storeAliases: aliases },
    create: { tenantId: tenant.id, storeAliases: aliases },
  });
  return c.json({ aliases });
});

p15.post("/domains", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { domain: raw } = await c.req.json<{ domain: string }>();
  const domain = normalizeDomainInput(String(raw ?? ""));
  if (!domain || !domain.includes(".")) {
    return c.json({ error: "Enter a valid domain (e.g. shop.example.com)" }, 400);
  }
  if (await isDomainBlacklisted(domain)) {
    return c.json({ error: "This domain cannot be used" }, 403);
  }

  const taken = await prisma.customDomain.findUnique({ where: { domain } });
  if (taken) return c.json({ error: "Domain already registered" }, 400);

  try {
    await assertTenantCanAddDomain(tenant.id);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Domain limit reached" }, 400);
  }

  const record = await prisma.customDomain.create({
    data: {
      tenantId: tenant.id,
      domain,
      verificationToken: newVerificationToken(),
    },
  });
  return c.json({
    domain: record,
    instructions: dnsInstructions(record.domain, record.verificationToken),
  }, 201);
});

p15.get("/domains/:id/dns", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const record = await prisma.customDomain.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!record) return c.json({ error: "Not found" }, 404);
  return c.json({
    instructions: dnsInstructions(record.domain, record.verificationToken),
    verificationToken: record.verificationToken,
    verified: record.verified,
    lastDnsOk: record.lastDnsOk,
    lastDnsCheckAt: record.lastDnsCheckAt?.toISOString() ?? null,
  });
});

p15.post("/domains/:id/check-dns", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  try {
    const result = await verifyMerchantDomainDns(
      tenant.id,
      c.req.param("id"),
      user?.email ?? session.sub
    );
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Check failed" }, 400);
  }
});

p15.post("/domains/:id/verify", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  try {
    const result = await verifyMerchantDomainDns(
      tenant.id,
      c.req.param("id"),
      user?.email ?? session.sub
    );
    if (!result.ok) {
      return c.json(result, 400);
    }
    return c.json({ domain: result.domain, vercel: result.vercel });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Verify failed" }, 400);
  }
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
