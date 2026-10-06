import { randomBytes } from "crypto";
import { Hono } from "hono";
import { OrderStatus, prisma } from "@ugclab/database";
import {
  B2bBuyerRole,
  B2bCompanyStatus,
  MetafieldOwnerType,
  ReturnStatus,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  getMerchantAccess,
  hasPermission,
  type MerchantPermission,
} from "../lib/permissions.js";
import { logActivity } from "../lib/activity-log.js";

const p17 = new Hono<AuthEnv>();
p17.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  return { tenant, session, access };
}

function requirePerm(
  access: { permissions: MerchantPermission[] },
  perm: MerchantPermission
) {
  return hasPermission(access.permissions, perm);
}

function newRma() {
  return `RMA-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/* ─── Product selling options ─── */

p17.patch("/products/:id/selling-options", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    preorderEnabled?: boolean;
    preorderShipAt?: string | null;
    tryBeforeYouBuyEnabled?: boolean;
    tryBeforeYouBuyDays?: number | null;
    subscriptionEnabled?: boolean;
    subscriptionInterval?: string | null;
  }>();
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  const interval = body.subscriptionInterval
    ? String(body.subscriptionInterval)
    : null;
  const allowed = ["week", "month", "year"];
  if (interval && !allowed.includes(interval)) {
    return c.json({ error: "Invalid subscription interval" }, 400);
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...(body.preorderEnabled !== undefined
        ? { preorderEnabled: !!body.preorderEnabled }
        : {}),
      ...(body.preorderShipAt !== undefined
        ? {
            preorderShipAt: body.preorderShipAt
              ? new Date(body.preorderShipAt)
              : null,
          }
        : {}),
      ...(body.tryBeforeYouBuyEnabled !== undefined
        ? { tryBeforeYouBuyEnabled: !!body.tryBeforeYouBuyEnabled }
        : {}),
      ...(body.tryBeforeYouBuyDays !== undefined
        ? {
            tryBeforeYouBuyDays:
              body.tryBeforeYouBuyDays == null
                ? null
                : Math.max(1, Math.min(365, Number(body.tryBeforeYouBuyDays) || 30)),
          }
        : {}),
      ...(body.subscriptionEnabled !== undefined
        ? {
            subscriptionEnabled: !!body.subscriptionEnabled,
            subscriptionInterval:
              body.subscriptionEnabled && interval ? interval : null,
          }
        : {}),
    },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "product.selling_options",
    summary: `Updated selling options for ${updated.title}`,
  });
  return c.json({ product: updated });
});

/* ─── Metafields ─── */

p17.get("/metafields", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const ownerType = c.req.query("ownerType") as MetafieldOwnerType | undefined;
  const ownerId = c.req.query("ownerId");
  if (!ownerType || !ownerId) {
    return c.json({ error: "ownerType and ownerId required" }, 400);
  }
  const metafields = await prisma.metafield.findMany({
    where: { tenantId: tenant.id, ownerType, ownerId },
    orderBy: [{ namespace: "asc" }, { key: "asc" }],
  });
  return c.json({ metafields });
});

p17.put("/metafields", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    ownerType: MetafieldOwnerType;
    ownerId: string;
    namespace?: string;
    key: string;
    type?: string;
    value: string;
  }>();
  if (!body.ownerType || !body.ownerId || !body.key) {
    return c.json({ error: "ownerType, ownerId, key required" }, 400);
  }
  const namespace = (body.namespace ?? "custom").trim() || "custom";
  const metafield = await prisma.metafield.upsert({
    where: {
      tenantId_ownerType_ownerId_namespace_key: {
        tenantId: tenant.id,
        ownerType: body.ownerType,
        ownerId: body.ownerId,
        namespace,
        key: body.key.trim(),
      },
    },
    create: {
      tenantId: tenant.id,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      namespace,
      key: body.key.trim(),
      type: body.type ?? "single_line_text",
      value: String(body.value ?? ""),
    },
    update: {
      type: body.type ?? "single_line_text",
      value: String(body.value ?? ""),
    },
  });
  return c.json({ metafield });
});

p17.delete("/metafields/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const existing = await prisma.metafield.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.metafield.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});

/* ─── Metaobjects ─── */

p17.get("/metaobject-definitions", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const definitions = await prisma.metaobjectDefinition.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });
  return c.json({ definitions });
});

p17.post("/metaobject-definitions", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    type?: string;
    name?: string;
    fieldDefs?: unknown;
  }>();
  const type = String(body.type ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");
  const name = String(body.name ?? "").trim();
  if (!type || !name) return c.json({ error: "type and name required" }, 400);
  const definition = await prisma.metaobjectDefinition.create({
    data: {
      tenantId: tenant.id,
      type,
      name,
      fieldDefs: (body.fieldDefs ?? []) as object,
    },
  });
  return c.json({ definition }, 201);
});

p17.get("/metaobjects", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const type = c.req.query("type");
  const definitions = await prisma.metaobjectDefinition.findMany({
    where: { tenantId: tenant.id, ...(type ? { type } : {}) },
    include: { metaobjects: { orderBy: { handle: "asc" }, take: 200 } },
  });
  return c.json({ definitions });
});

p17.post("/metaobjects", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    definitionId?: string;
    handle?: string;
    fields?: unknown;
  }>();
  const def = await prisma.metaobjectDefinition.findFirst({
    where: { id: String(body.definitionId ?? ""), tenantId: tenant.id },
  });
  if (!def) return c.json({ error: "Definition not found" }, 404);
  const handle = String(body.handle ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-");
  if (!handle) return c.json({ error: "handle required" }, 400);
  const metaobject = await prisma.metaobject.create({
    data: {
      tenantId: tenant.id,
      definitionId: def.id,
      handle,
      fields: (body.fields ?? {}) as object,
    },
  });
  return c.json({ metaobject }, 201);
});

p17.patch("/metaobjects/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const existing = await prisma.metaobject.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{ fields?: unknown; handle?: string }>();
  const metaobject = await prisma.metaobject.update({
    where: { id: existing.id },
    data: {
      ...(body.fields !== undefined ? { fields: body.fields as object } : {}),
      ...(body.handle
        ? {
            handle: String(body.handle)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_-]+/g, "-"),
          }
        : {}),
    },
  });
  return c.json({ metaobject });
});

/* ─── Returns ─── */

p17.get("/returns", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const returns = await prisma.returnRequest.findMany({
    where: { tenantId: tenant.id },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      items: { include: { orderLineItem: true } },
      customer: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json({ returns });
});

p17.patch("/returns/:id", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const existing = await prisma.returnRequest.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { order: true, items: true },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    status?: ReturnStatus;
    labelUrl?: string | null;
    trackingNumber?: string | null;
    refundAmountCents?: number | null;
    note?: string | null;
  }>();

  const data: {
    status?: ReturnStatus;
    labelUrl?: string | null;
    trackingNumber?: string | null;
    refundAmountCents?: number | null;
    note?: string | null;
  } = {};
  if (body.status && Object.values(ReturnStatus).includes(body.status)) {
    data.status = body.status;
  }
  if (body.labelUrl !== undefined) data.labelUrl = body.labelUrl;
  if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber;
  if (body.refundAmountCents !== undefined) {
    data.refundAmountCents = body.refundAmountCents;
  }
  if (body.note !== undefined) data.note = body.note;

  if (data.status === ReturnStatus.LABEL_CREATED && !data.labelUrl && !existing.labelUrl) {
    const { createReturnLabelForRequest } = await import("../lib/return-ops.js");
    const labeled = await createReturnLabelForRequest(existing.id);
    data.labelUrl = labeled.labelUrl;
    data.trackingNumber = labeled.trackingNumber ?? data.trackingNumber;
  }

  let updated = await prisma.returnRequest.update({
    where: { id: existing.id },
    data,
    include: {
      order: { select: { id: true, orderNumber: true } },
      items: true,
    },
  });

  if (data.status === ReturnStatus.RECEIVED) {
    const { restockReturnItems } = await import("../lib/return-ops.js");
    await restockReturnItems(existing.id, session.email);
  }

  if (data.status === ReturnStatus.REFUNDED) {
    const { refundReturnRequest } = await import("../lib/return-ops.js");
    updated = (await refundReturnRequest(
      existing.id,
      session.email,
      body.refundAmountCents
    )) as typeof updated;
  }

  if (data.status === ReturnStatus.EXCHANGED) {
    const { createExchangeOrder } = await import("../lib/return-ops.js");
    await createExchangeOrder(existing.id, session.email);
    updated = await prisma.returnRequest.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        order: { select: { id: true, orderNumber: true } },
        items: true,
      },
    });
  }

  if (
    data.status &&
    data.status !== existing.status &&
    data.status !== ReturnStatus.REFUNDED &&
    data.status !== ReturnStatus.EXCHANGED
  ) {
    const { emailCustomerAboutOrder } = await import("../lib/transactional-email.js");
    emailCustomerAboutOrder(existing.orderId, "returnUpdate", {
      rma: existing.rmaCode,
      status: data.status,
      note: body.note?.trim() || "",
    }).catch(() => {});
  }

  if (data.status) {
    await prisma.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: existing.orderId,
        type: "NOTE",
        body: `Return ${existing.rmaCode} → ${data.status}`,
      },
    });
  }

  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "return.update",
    summary: `Return ${existing.rmaCode} updated`,
  });
  return c.json({ return: updated });
});

/* ─── Warehouses pickup (BOPIS) ─── */

p17.patch("/warehouses/:id/pickup", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "growth") && !requirePerm(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const wh = await prisma.warehouse.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!wh) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    pickupEnabled?: boolean;
    pickupInstructions?: string | null;
    pickupHours?: unknown;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    postal?: string | null;
    country?: string | null;
    phone?: string | null;
  }>();
  const updated = await prisma.warehouse.update({
    where: { id: wh.id },
    data: {
      ...(body.pickupEnabled !== undefined
        ? { pickupEnabled: !!body.pickupEnabled }
        : {}),
      ...(body.pickupInstructions !== undefined
        ? { pickupInstructions: body.pickupInstructions }
        : {}),
      ...(body.pickupHours !== undefined
        ? { pickupHours: body.pickupHours as object }
        : {}),
      ...(body.address1 !== undefined ? { address1: body.address1 } : {}),
      ...(body.address2 !== undefined ? { address2: body.address2 } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.postal !== undefined ? { postal: body.postal } : {}),
      ...(body.country !== undefined
        ? { country: body.country ? String(body.country).toUpperCase().slice(0, 2) : null }
        : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
    },
  });
  return c.json({ warehouse: updated });
});

p17.post("/orders/:id/ready-for-pickup", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.fulfillmentMethod !== "PICKUP") {
    return c.json({ error: "Order is not a pickup order" }, 400);
  }
  if (
    order.buyerProtection &&
    order.captureMethod === "manual" &&
    order.paymentCaptureStatus === "NONE" &&
    order.status === "PENDING"
  ) {
    return c.json({ error: "The buyer's card is not authorized yet." }, 400);
  }
  const { captureAuthorizedPayment } = await import("../lib/buyer-protection.js");
  await captureAuthorizedPayment(order.id, session.email);
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { pickupReadyAt: new Date(), status: OrderStatus.FULFILLED },
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: `Ready for pickup (by ${session.email})`,
    },
  });

  const email = order.guestEmail;
  const customer = order.customerId
    ? await prisma.customer.findUnique({ where: { id: order.customerId } })
    : null;
  const to = email || customer?.email;
  if (to) {
    const wh = order.pickupWarehouseId
      ? await prisma.warehouse.findUnique({ where: { id: order.pickupWarehouseId } })
      : null;
    const { emailCustomerAboutOrder } = await import("../lib/transactional-email.js");
    const address = wh?.address1
      ? `${wh.address1}${wh.city ? `, ${wh.city}` : ""}`
      : "";
    emailCustomerAboutOrder(order.id, "pickupReady", {
      place: wh ? ` at ${wh.name}` : "",
      address,
      instructions: wh?.pickupInstructions ?? "",
      hours: wh?.pickupHours ? `Hours: ${JSON.stringify(wh.pickupHours)}` : "",
    }).catch(() => {});
  }

  return c.json({ order: updated });
});

/* ─── B2B ─── */

p17.get("/b2b/companies", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const companies = await prisma.b2bCompany.findMany({
    where: { tenantId: tenant.id },
    include: {
      buyers: { include: { customer: { select: { id: true, email: true, name: true } } } },
      priceList: { select: { id: true, name: true } },
      _count: { select: { orders: true, customers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ companies });
});

p17.post("/b2b/companies", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    name?: string;
    paymentTermsDays?: number | null;
    note?: string | null;
    priceListId?: string | null;
    status?: B2bCompanyStatus;
  }>();
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const company = await prisma.b2bCompany.create({
    data: {
      tenantId: tenant.id,
      name,
      paymentTermsDays: body.paymentTermsDays ?? null,
      note: body.note ?? null,
      priceListId: body.priceListId ?? null,
      status: body.status ?? B2bCompanyStatus.ACTIVE,
    },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "b2b.company.create",
    summary: `Created B2B company ${name}`,
  });
  return c.json({ company }, 201);
});

p17.patch("/b2b/companies/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const existing = await prisma.b2bCompany.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    name?: string;
    status?: B2bCompanyStatus;
    paymentTermsDays?: number | null;
    depositPercent?: number | null;
    note?: string | null;
    priceListId?: string | null;
    catalogs?: { id: string; name: string; productIds: string[] }[];
  }>();
  let catalogsData: object | undefined;
  if (body.catalogs !== undefined) {
    catalogsData = body.catalogs.map((cat, i) => ({
      id: cat.id?.trim() || `cat_${i + 1}`,
      name: String(cat.name ?? "").trim() || `Catalog ${i + 1}`,
      productIds: Array.isArray(cat.productIds)
        ? cat.productIds.map((id) => String(id)).filter(Boolean)
        : [],
    }));
  }
  const company = await prisma.b2bCompany.update({
    where: { id: existing.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.paymentTermsDays !== undefined
        ? { paymentTermsDays: body.paymentTermsDays }
        : {}),
      ...(body.depositPercent !== undefined
        ? {
            depositPercent:
              body.depositPercent == null
                ? null
                : Math.min(100, Math.max(0, Math.round(Number(body.depositPercent)))),
          }
        : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.priceListId !== undefined ? { priceListId: body.priceListId } : {}),
      ...(catalogsData !== undefined ? { catalogs: catalogsData } : {}),
    },
  });
  return c.json({ company });
});

p17.post("/b2b/companies/:id/setup-card-session", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const company = await prisma.b2bCompany.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      buyers: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { customer: true },
      },
    },
  });
  if (!company) return c.json({ error: "Not found" }, 404);
  const buyer = company.buyers[0];
  if (!buyer?.customer) {
    return c.json({ error: "Add a buyer to this company first" }, 400);
  }
  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { stripeAccountId: true, slug: true },
  });
  if (!fullTenant?.stripeAccountId) {
    return c.json({ error: "Connect Stripe to save cards" }, 400);
  }
  const { getStripe, isStripeConfigured } = await import("../lib/stripe.js");
  if (!isStripeConfigured()) {
    return c.json({ error: "Stripe not configured" }, 400);
  }
  const stripe = getStripe();
  const opts = { stripeAccount: fullTenant.stripeAccountId };
  let customer = buyer.customer;
  let stripeCustomerId = customer.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const sc = await stripe.customers.create(
      {
        email: customer.email,
        name: customer.name ?? undefined,
        metadata: {
          tenantId: tenant.id,
          customerId: customer.id,
          b2bCompanyId: company.id,
        },
      },
      opts
    );
    stripeCustomerId = sc.id;
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { stripeCustomerId: sc.id },
    });
  }
  const merchantBase = process.env.MERCHANT_WEB_URL ?? "http://localhost:3001";
  const session = await stripe.checkout.sessions.create(
    {
      mode: "setup",
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      success_url: `${merchantBase}/b2b?cardSaved=1&company=${company.id}`,
      cancel_url: `${merchantBase}/b2b`,
      metadata: {
        tenantId: tenant.id,
        b2bCompanyId: company.id,
        customerId: customer.id,
      },
    },
    opts
  );
  if (!session.url) return c.json({ error: "Could not create session" }, 500);
  return c.json({ url: session.url });
});

p17.post("/b2b/companies/:id/buyers", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const company = await prisma.b2bCompany.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!company) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    email?: string;
    name?: string;
    role?: B2bBuyerRole;
  }>();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return c.json({ error: "email required" }, 400);

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email,
        name: body.name?.trim() || null,
        b2bCompanyId: company.id,
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { b2bCompanyId: company.id, name: body.name?.trim() || customer.name },
    });
  }

  const buyer = await prisma.b2bBuyer.upsert({
    where: { customerId: customer.id },
    create: {
      companyId: company.id,
      customerId: customer.id,
      email,
      role: body.role ?? B2bBuyerRole.BUYER,
    },
    update: {
      companyId: company.id,
      email,
      role: body.role ?? B2bBuyerRole.BUYER,
    },
  });
  return c.json({ buyer, customer }, 201);
});

p17.get("/b2b/price-lists", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const priceLists = await prisma.b2bPriceList.findMany({
    where: { tenantId: tenant.id },
    include: {
      items: { include: { product: { select: { id: true, title: true } } } },
      _count: { select: { companies: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ priceLists });
});

p17.post("/b2b/price-lists", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    name?: string;
    currency?: string;
    items?: { productId: string; variantId?: string | null; priceAmount: number }[];
  }>();
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { currency: true },
  });
  const currency = (body.currency ?? settings?.currency ?? "USD")
    .toUpperCase()
    .slice(0, 3);
  const priceList = await prisma.b2bPriceList.create({
    data: {
      tenantId: tenant.id,
      name,
      currency,
      items: body.items?.length
        ? {
            create: body.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? null,
              priceAmount: Math.max(0, Math.round(Number(i.priceAmount) || 0)),
            })),
          }
        : undefined,
    },
    include: { items: true },
  });
  return c.json({ priceList }, 201);
});

p17.post("/b2b/price-lists/:id/items", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const list = await prisma.b2bPriceList.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    productId?: string;
    variantId?: string | null;
    priceAmount?: number;
  }>();
  if (!body.productId) return c.json({ error: "productId required" }, 400);
  const variantKey = body.variantId ? String(body.variantId) : "";
  const item = await prisma.b2bPriceListItem.upsert({
    where: {
      priceListId_productId_variantId: {
        priceListId: list.id,
        productId: body.productId,
        variantId: variantKey,
      },
    },
    create: {
      priceListId: list.id,
      productId: body.productId,
      variantId: variantKey,
      priceAmount: Math.max(0, Math.round(Number(body.priceAmount) || 0)),
    },
    update: {
      priceAmount: Math.max(0, Math.round(Number(body.priceAmount) || 0)),
    },
  });
  return c.json({ item });
});

/* ─── Product subscriptions list ─── */

p17.get("/product-subscriptions", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const subscriptions = await prisma.productSubscription.findMany({
    where: { tenantId: tenant.id },
    include: {
      customer: { select: { id: true, email: true, name: true } },
      product: { select: { id: true, title: true } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json({ subscriptions });
});

p17.post("/product-subscriptions/:id/cancel", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const sub = await prisma.productSubscription.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!sub) return c.json({ error: "Not found" }, 404);
  const { getStripe, isStripeConfigured } = await import("../lib/stripe.js");
  if (isStripeConfigured() && sub.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
    } catch {
      /* already canceled remotely */
    }
  }
  const updated = await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED" },
  });
  await prisma.digitalEntitlement.updateMany({
    where: { subscriptionId: sub.id },
    data: { active: false },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "subscription.cancel",
    summary: `Cancelled subscription ${sub.id}`,
  });
  return c.json({ subscription: updated });
});

p17.post("/product-subscriptions/:id/pause", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requirePerm(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const sub = await prisma.productSubscription.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!sub) return c.json({ error: "Not found" }, 404);
  const { getStripe, isStripeConfigured } = await import("../lib/stripe.js");
  if (isStripeConfigured() && sub.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: { behavior: "mark_uncollectible" },
      });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Could not pause in Stripe" },
        400
      );
    }
  }
  const updated = await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE" },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "subscription.pause",
    summary: `Paused subscription ${sub.id}`,
  });
  return c.json({ subscription: updated });
});

export { p17, newRma };
