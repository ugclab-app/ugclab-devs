import { Hono } from "hono";
import { PromotionType, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { getMerchantAnalytics } from "../lib/analytics.js";

const p3 = new Hono<AuthEnv>();
p3.use("*", requireAuth);

p3.get("/analytics", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const range = c.req.query("range") === "90" ? 90 : c.req.query("range") === "30" ? 30 : 7;
  const analytics = await getMerchantAnalytics(tenant.id, range);
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    analytics,
  });
});

p3.get("/promotions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const promotions = await prisma.storePromotion.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ promotions });
});

p3.post("/promotions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    type?: string;
    value?: number;
    minOrderAmount?: number;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  }>();
  const type =
    body.type === "FREE_SHIPPING"
      ? PromotionType.FREE_SHIPPING
      : PromotionType.CART_PERCENT;

  const promotion = await prisma.storePromotion.create({
    data: {
      tenantId: tenant.id,
      type,
      value: Math.round(Number(body.value ?? 0)),
      minOrderAmount:
        body.minOrderAmount != null
          ? Math.round(Number(body.minOrderAmount))
          : null,
      active: body.active !== false,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  });
  return c.json({ promotion }, 201);
});

p3.patch("/promotions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    active?: boolean;
    value?: number;
    minOrderAmount?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }>();
  const promo = await prisma.storePromotion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!promo) return c.json({ error: "Not found" }, 404);
  const updated = await prisma.storePromotion.update({
    where: { id: promo.id },
    data: {
      ...(body.active != null ? { active: body.active } : {}),
      ...(body.value != null ? { value: Math.round(body.value) } : {}),
      ...(body.minOrderAmount !== undefined
        ? {
            minOrderAmount:
              body.minOrderAmount == null
                ? null
                : Math.round(body.minOrderAmount),
          }
        : {}),
      ...(body.startsAt !== undefined
        ? { startsAt: body.startsAt ? new Date(body.startsAt) : null }
        : {}),
      ...(body.endsAt !== undefined
        ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
        : {}),
    },
  });
  return c.json({ promotion: updated });
});

p3.delete("/promotions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const promo = await prisma.storePromotion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!promo) return c.json({ error: "Not found" }, 404);
  await prisma.storePromotion.delete({ where: { id: promo.id } });
  return c.json({ ok: true });
});

p3.post("/customers/import.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV required" }, 400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let created = 0;
  for (const line of lines.slice(1)) {
    const [email, name, country] = line.split(",").map((x) => x.trim());
    if (!email?.includes("@")) continue;
    const norm = email.toLowerCase();
    const existing = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: norm } },
    });
    if (existing) continue;
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: norm,
        name: name || null,
        country: country?.slice(0, 2).toUpperCase() || null,
      },
    });
    created += 1;
  }
  return c.json({ created });
});

p3.post("/orders/import.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV required" }, 400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let created = 0;
  const currency = tenant.settings?.currency ?? "USD";

  for (const line of lines.slice(1)) {
    const [email, orderNumber, totalStr, country] = line
      .split(",")
      .map((x) => x.trim());
    if (!email?.includes("@") || !orderNumber) continue;

    const exists = await prisma.order.findFirst({
      where: { tenantId: tenant.id, orderNumber },
    });
    if (exists) continue;

    const totalAmount = Math.round(parseFloat(totalStr || "0") * 100);
    let customer = await prisma.customer.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() },
      },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
          country: country?.slice(0, 2).toUpperCase() || null,
        },
      });
    }

    await prisma.order.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        orderNumber,
        status: "PAID",
        currency,
        subtotalAmount: totalAmount,
        totalAmount,
        shippingCountry: country?.slice(0, 2).toUpperCase() || null,
        guestEmail: email.toLowerCase(),
        accessToken: crypto.randomUUID().replace(/-/g, ""),
      },
    });
    created += 1;
  }
  return c.json({ created });
});

export { p3 };
