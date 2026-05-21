import { Hono } from "hono";
import { OrderStatus, prisma, ProductStatus } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { logActivity } from "../lib/activity-log.js";
import {
  getMerchantAccess,
  hasPermission,
  MERCHANT_PERMISSIONS,
  type MerchantPermission,
} from "../lib/permissions.js";
import { generateTotpSecret, totpUri, verifyTotp } from "../lib/totp.js";

const p5 = new Hono<AuthEnv>();
p5.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  return {
    tenant,
    session,
    access,
    userEmail: user?.email ?? session.email,
  };
}

function requirePerm(access: { permissions: MerchantPermission[] }, perm: MerchantPermission) {
  return hasPermission(access.permissions, perm);
}

p5.get("/access", async (c) => {
  const { access } = await actor(c);
  return c.json({
    isOwner: access.isOwner,
    permissions: access.permissions,
    all: MERCHANT_PERMISSIONS,
  });
});

p5.get("/activity-log", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "activity-log")) return c.json({ error: "Forbidden" }, 403);
  const logs = await prisma.activityLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json({ logs });
});

p5.get("/abandoned-carts", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "abandoned-carts")) return c.json({ error: "Forbidden" }, 403);
  const carts = await prisma.abandonedCart.findMany({
    where: { tenantId: tenant.id, convertedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return c.json({ carts });
});

p5.get("/customers/segments", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);

  const customers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    include: {
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        select: { totalAmount: true, createdAt: true },
      },
    },
    take: 500,
  });

  const vipThreshold = 50000;
  const segments = {
    all: customers.length,
    vip: 0,
    repeat: 0,
    new: 0,
    byCountry: {} as Record<string, number>,
    customers: [] as {
      id: string;
      email: string;
      name: string | null;
      country: string | null;
      orderCount: number;
      totalSpent: number;
      segment: string[];
    }[],
  };

  for (const cust of customers) {
    const orderCount = cust.orders.length;
    const totalSpent = cust.orders.reduce((s, o) => s + o.totalAmount, 0);
    const tags: string[] = [];
    if (totalSpent >= vipThreshold) tags.push("vip");
    if (orderCount >= 2) tags.push("repeat");
    if (orderCount === 0) tags.push("new");
    if (totalSpent >= vipThreshold) segments.vip++;
    if (orderCount >= 2) segments.repeat++;
    if (orderCount === 0) segments.new++;
    if (cust.country) {
      segments.byCountry[cust.country] = (segments.byCountry[cust.country] ?? 0) + 1;
    }
    segments.customers.push({
      id: cust.id,
      email: cust.email,
      name: cust.name,
      country: cust.country,
      orderCount,
      totalSpent,
      segment: tags.length ? tags : ["active"],
    });
  }

  return c.json(segments);
});

p5.post("/orders/bulk-export", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!ids?.length) return c.json({ error: "No orders selected" }, 400);

  const orders = await prisma.order.findMany({
    where: { id: { in: ids }, tenantId: tenant.id },
    include: {
      customer: { select: { email: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const header =
    "orderNumber,status,email,total,currency,createdAt,items";
  const rows = orders.map((o) => {
    const items = o.items.map((i) => `${i.title}x${i.quantity}`).join("|");
    return [
      o.orderNumber,
      o.status,
      o.customer?.email ?? o.guestEmail ?? "",
      (o.totalAmount / 100).toFixed(2),
      o.currency,
      o.createdAt.toISOString(),
      `"${items.replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export.csv"`,
    },
  });
});

p5.get("/orders/:id/packing-slip", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { customer: true, items: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  const lines = order.items
    .map(
      (i) =>
        `<tr><td>${i.title}</td><td>${i.quantity}</td><td>${(i.totalAmount / 100).toFixed(2)} ${order.currency}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>Packing slip #${order.orderNumber}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head>
<body><h1>${tenant.name}</h1><h2>Packing slip #${order.orderNumber}</h2>
<p><strong>Ship to:</strong> ${order.shippingName ?? order.customer?.name ?? "—"}<br/>
${order.shippingAddress1 ?? ""} ${order.shippingCity ?? ""} ${order.shippingPostal ?? ""}</p>
<table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>
<script>window.print()</script></body></html>`;

  return c.html(html);
});

p5.patch("/staff/:id/permissions", async (c) => {
  const { tenant, session, access, userEmail } = await actor(c);
  if (!access.isOwner) return c.json({ error: "Only owner can edit permissions" }, 403);
  const { permissions } = await c.req.json<{ permissions: string[] }>();
  const member = await prisma.tenantMember.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!member) return c.json({ error: "Not found" }, 404);

  const allowed = (permissions ?? []).filter((p) =>
    (MERCHANT_PERMISSIONS as readonly string[]).includes(p)
  );

  await prisma.tenantMember.update({
    where: { id: member.id },
    data: { permissions: allowed },
  });

  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail,
    action: "staff.permissions",
    entityType: "staff",
    entityId: member.id,
    summary: `Updated permissions for ${member.email}`,
    meta: { permissions: allowed },
  });

  return c.json({ ok: true, permissions: allowed });
});

p5.get("/auth/2fa/status", async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.get("session").sub },
    select: { totpEnabled: true, email: true },
  });
  return c.json({ enabled: user?.totpEnabled ?? false, email: user?.email });
});

p5.post("/auth/2fa/setup", async (c) => {
  const session = c.get("session");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return c.json({ error: "User not found" }, 404);

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return c.json({
    secret,
    uri: totpUri(user.email, secret),
  });
});

p5.post("/auth/2fa/enable", async (c) => {
  const session = c.get("session");
  const { code } = await c.req.json<{ code: string }>();
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.totpSecret) return c.json({ error: "Run setup first" }, 400);
  if (!verifyTotp(user.totpSecret, String(code ?? ""))) {
    return c.json({ error: "Invalid code" }, 400);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });
  return c.json({ ok: true });
});

p5.post("/auth/2fa/disable", async (c) => {
  const session = c.get("session");
  const { code, password } = await c.req.json<{ code: string; password: string }>();
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.passwordHash) return c.json({ error: "User not found" }, 404);
  const { compare } = await import("bcryptjs");
  if (!(await compare(String(password ?? ""), user.passwordHash))) {
    return c.json({ error: "Invalid password" }, 401);
  }
  if (user.totpEnabled && user.totpSecret) {
    if (!verifyTotp(user.totpSecret, String(code ?? ""))) {
      return c.json({ error: "Invalid 2FA code" }, 400);
    }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  return c.json({ ok: true });
});

export { p5, actor, requirePerm };
