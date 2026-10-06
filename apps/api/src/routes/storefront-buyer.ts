import { randomBytes } from "crypto";
import type { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { hash, compare } from "bcryptjs";
import { prisma, ProductStatus } from "@ugclab/database";
import { CUSTOMER_COOKIE, resolveTenantBySlug } from "../lib/store-cart.js";
function tenantSlug(c: { req: { query: (k: string) => string | undefined } }) {
  return String(c.req.query("tenant") ?? "demo").toLowerCase();
}

function setCustomerCookie(
  c: Parameters<typeof setCookie>[0],
  tenantId: string,
  customerId: string
) {
  setCookie(c, CUSTOMER_COOKIE, JSON.stringify({ tenantId, customerId }), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

async function signedInCustomer(c: Parameters<typeof getCookie>[0], tenantId: string) {
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tenantId?: string; customerId?: string };
    if (parsed.tenantId !== tenantId || !parsed.customerId) return null;
    return prisma.customer.findFirst({
      where: { id: parsed.customerId, tenantId },
    });
  } catch {
    return null;
  }
}

function cleanEmail(raw: unknown) {
  return String(raw ?? "").trim().toLowerCase();
}

type AddressBody = {
  label?: string;
  name?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postal?: string;
  country?: string;
  isDefault?: boolean;
};

function parseAddress(body: AddressBody) {
  const name = String(body.name ?? "").trim();
  const address1 = String(body.address1 ?? "").trim();
  const city = String(body.city ?? "").trim();
  const country = String(body.country ?? "").trim().toUpperCase().slice(0, 2);
  if (!name || !address1 || !city || country.length !== 2) return null;
  return {
    label: String(body.label ?? "").trim() || null,
    name,
    phone: String(body.phone ?? "").trim() || null,
    address1,
    address2: String(body.address2 ?? "").trim() || null,
    city,
    postal: String(body.postal ?? "").trim() || null,
    country,
    isDefault: body.isDefault === true,
  };
}

export function registerBuyerRoutes(store: Hono) {
  store.post("/account/register", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
    const email = cleanEmail(body.email);
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim() || null;
    if (!email.includes("@")) return c.json({ error: "Valid email required" }, 400);
    if (password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
    const passwordHash = await hash(password, 12);
    const existing = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (existing?.passwordHash) {
      return c.json({ error: "An account with this email already exists" }, 400);
    }
    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: { passwordHash, name: name ?? existing.name },
        })
      : await prisma.customer.create({
          data: { tenantId: tenant.id, email, name, passwordHash },
        });
    setCustomerCookie(c, tenant.id, customer.id);
    return c.json({ ok: true });
  });

  store.post("/account/forgot", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const body = await c.req.json<{ email?: string }>();
    const email = cleanEmail(body.email);
    const customer = email.includes("@")
      ? await prisma.customer.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email } },
        })
      : null;
    if (customer) {
      const token = randomBytes(24).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60);
      await prisma.customer.update({
        where: { id: customer.id },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
      const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
      const url = `${base}/account/reset?tenant=${encodeURIComponent(tenant.slug)}&token=${token}`;
      if (process.env.NODE_ENV !== "production") {
        console.info("[account] password reset", url);
      }
      try {
        const { sendTemplatedStoreEmail } = await import("../lib/transactional-email.js");
        await sendTemplatedStoreEmail(tenant.id, "passwordReset", customer.email, {
          storeName: tenant.name,
          url,
        });
      } catch (e) {
        console.error("[account] reset email", e);
      }
    }
    return c.json({ ok: true });
  });

  store.post("/account/reset", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const body = await c.req.json<{ token?: string; password?: string }>();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    if (!token) return c.json({ error: "Reset link is invalid" }, 400);
    if (password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
    const customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, passwordResetToken: token },
    });
    if (
      !customer?.passwordResetExpires ||
      customer.passwordResetExpires.getTime() < Date.now()
    ) {
      return c.json({ error: "Reset link has expired" }, 400);
    }
    const passwordHash = await hash(password, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    setCustomerCookie(c, tenant.id, customer.id);
    return c.json({ ok: true });
  });

  store.post("/account/logout", async (c) => {
    deleteCookie(c, CUSTOMER_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  store.patch("/account/profile", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    const body = await c.req.json<{
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    }>();
    const data: { name?: string | null; passwordHash?: string } = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || null;
    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return c.json({ error: "Password must be at least 8 characters" }, 400);
      }
      if (!customer.passwordHash) {
        return c.json({ error: "Set a password from the reset link first" }, 400);
      }
      const ok = await compare(String(body.currentPassword ?? ""), customer.passwordHash);
      if (!ok) return c.json({ error: "Current password is wrong" }, 400);
      data.passwordHash = await hash(body.newPassword, 12);
    }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data,
    });
    return c.json({ customer: { id: updated.id, email: updated.email, name: updated.name } });
  });

  store.get("/account/addresses", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ addresses: [] });
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ addresses: [] });
    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return c.json({ addresses });
  });

  store.post("/account/addresses", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    const parsed = parseAddress(await c.req.json<AddressBody>());
    if (!parsed) return c.json({ error: "Name, address, city, and country are required" }, 400);
    if (parsed.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }
    const address = await prisma.customerAddress.create({
      data: { tenantId: tenant.id, customerId: customer.id, ...parsed },
    });
    return c.json({ address }, 201);
  });

  store.patch("/account/addresses/:id", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    const existing = await prisma.customerAddress.findFirst({
      where: { id: c.req.param("id"), customerId: customer.id },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    const parsed = parseAddress(await c.req.json<AddressBody>());
    if (!parsed) return c.json({ error: "Name, address, city, and country are required" }, 400);
    if (parsed.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }
    const address = await prisma.customerAddress.update({
      where: { id: existing.id },
      data: parsed,
    });
    return c.json({ address });
  });

  store.delete("/account/addresses/:id", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    await prisma.customerAddress.deleteMany({
      where: { id: c.req.param("id"), customerId: customer.id },
    });
    return c.json({ ok: true });
  });

  store.get("/account/wishlist", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ productIds: [] });
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ productIds: [] });
    const rows = await prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      select: { productId: true },
    });
    return c.json({ productIds: rows.map((r) => r.productId) });
  });

  store.post("/account/wishlist", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    const body = await c.req.json<{ productId?: string; productIds?: string[] }>();
    const ids = [
      ...(body.productId ? [body.productId] : []),
      ...(body.productIds ?? []),
    ]
      .map((id) => String(id).trim())
      .filter(Boolean);
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, id: { in: ids }, status: ProductStatus.ACTIVE },
      select: { id: true },
    });
    if (products.length) {
      await prisma.wishlistItem.createMany({
        data: products.map((p) => ({
          tenantId: tenant.id,
          customerId: customer.id,
          productId: p.id,
        })),
        skipDuplicates: true,
      });
    }
    const rows = await prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      select: { productId: true },
    });
    return c.json({ productIds: rows.map((r) => r.productId) });
  });

  store.delete("/account/wishlist", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const customer = await signedInCustomer(c, tenant.id);
    if (!customer) return c.json({ error: "Sign in required" }, 401);
    const productId = c.req.query("productId")?.trim();
    await prisma.wishlistItem.deleteMany({
      where: {
        customerId: customer.id,
        ...(productId ? { productId } : {}),
      },
    });
    return c.json({ ok: true });
  });

  store.post("/stock-alerts", async (c) => {
    const tenant = await resolveTenantBySlug(tenantSlug(c));
    if (!tenant) return c.json({ error: "Store not found" }, 404);
    const body = await c.req.json<{
      productId?: string;
      variantId?: string;
      email?: string;
    }>();
    const email = cleanEmail(body.email);
    if (!email.includes("@")) return c.json({ error: "Valid email required" }, 400);
    const product = await prisma.product.findFirst({
      where: {
        id: String(body.productId ?? ""),
        tenantId: tenant.id,
        status: ProductStatus.ACTIVE,
      },
    });
    if (!product) return c.json({ error: "Product not found" }, 404);
    const variantKey = String(body.variantId ?? "").trim();
    await prisma.stockAlert.upsert({
      where: {
        productId_email_variantKey: {
          productId: product.id,
          email,
          variantKey,
        },
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        email,
        variantKey,
      },
      update: { notifiedAt: null },
    });
    return c.json({ ok: true });
  });
}
