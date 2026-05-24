import { Hono } from "hono";
import {
  CollectionRuleType,
  prisma,
  ProductType,
  TenantMemberRole,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { normalizeSlug, requireTenant } from "../lib/merchant.js";
import { saveProductImage, uploadPublicUrl } from "../lib/uploads.js";
import { sendCustomerOrderReceipt } from "../lib/order-emails.js";
import { renderOrderHtml } from "../lib/order-document.js";
import { randomBytes } from "crypto";
import { logActivity } from "../lib/activity-log.js";
import {
  buildInviteLink,
  inviteExpiresAt,
  isInviteExpired,
  sendStaffInviteEmail,
} from "../lib/staff-invite.js";
import {
  sanitizeStaffPermissions,
  requireOwnerAccess,
} from "../lib/permissions.js";
import { useOrderRouteGuards } from "../middleware/merchant-guards.js";

const p1 = new Hono<AuthEnv>();
p1.use("*", requireAuth);
useOrderRouteGuards(p1);

function parseVariantsJson(raw: unknown) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v: Record<string, unknown>) => ({
        title: String(v.title ?? "").trim(),
        sku: String(v.sku ?? "").trim() || null,
        priceAmount: Math.round(parseFloat(String(v.price ?? "0")) * 100),
        inventory:
          v.inventory === "" || v.inventory == null
            ? null
            : parseInt(String(v.inventory), 10),
      }))
      .filter((v) => v.title);
  } catch {
    return [];
  }
}

async function syncProductVariants(
  tenantId: string,
  productId: string,
  variants: ReturnType<typeof parseVariantsJson>
) {
  await prisma.productVariant.deleteMany({ where: { productId, tenantId } });
  if (variants.length === 0) return;
  await prisma.productVariant.createMany({
    data: variants.map((v) => ({
      tenantId,
      productId,
      title: v.title,
      sku: v.sku,
      priceAmount: v.priceAmount,
      inventory: v.inventory,
    })),
  });
}

function mapProductImages(
  images: { id: string; storageKey: string; fileName: string; sortOrder: number; alt: string | null }[]
) {
  return images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      ...img,
      url: uploadPublicUrl(img.storageKey),
    }));
}

// ——— Collections ———
function parseCollectionRuleType(raw: unknown): CollectionRuleType {
  if (raw === "AUTO_TAG") return CollectionRuleType.AUTO_TAG;
  if (raw === "AUTO_TYPE") return CollectionRuleType.AUTO_TYPE;
  return CollectionRuleType.MANUAL;
}

function collectionRuleData(body: {
  ruleType?: unknown;
  ruleTag?: string;
  ruleProductType?: string;
  description?: string | null;
}) {
  const ruleType = parseCollectionRuleType(body.ruleType);
  return {
    ruleType,
    ruleTag:
      ruleType === CollectionRuleType.AUTO_TAG
        ? String(body.ruleTag ?? "").trim() || null
        : null,
    ruleProductType:
      ruleType === CollectionRuleType.AUTO_TYPE && body.ruleProductType
        ? (body.ruleProductType as ProductType)
        : null,
    ...(body.description !== undefined
      ? { description: body.description ? String(body.description) : null }
      : {}),
  };
}

async function syncCollectionProducts(collectionId: string, productIds: string[]) {
  await prisma.collectionProduct.deleteMany({ where: { collectionId } });
  const ids = productIds.filter(Boolean);
  if (!ids.length) return;
  await prisma.collectionProduct.createMany({
    data: ids.map((productId, sortOrder) => ({
      collectionId,
      productId,
      sortOrder,
    })),
    skipDuplicates: true,
  });
}

const collectionInclude = {
  products: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      product: { select: { id: true, title: true, slug: true, status: true, type: true } },
    },
  },
};

p1.get("/collections", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const collections = await prisma.collection.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { products: true } } },
    orderBy: { title: "asc" },
  });
  return c.json({ collections });
});

p1.post("/collections", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    title: string;
    slug?: string;
    description?: string | null;
    ruleType?: string;
    ruleTag?: string;
    ruleProductType?: string;
    productIds?: string[];
  }>();
  const titleTrim = String(body.title ?? "").trim();
  if (!titleTrim) return c.json({ error: "Title required" }, 400);
  const slug = normalizeSlug(body.slug ?? titleTrim);
  const dup = await prisma.collection.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });
  if (dup) return c.json({ error: "Slug already used" }, 400);
  const collection = await prisma.collection.create({
    data: {
      tenantId: tenant.id,
      title: titleTrim,
      slug,
      ...collectionRuleData(body),
    },
  });
  if (body.productIds?.length) {
    await syncCollectionProducts(collection.id, body.productIds);
  }
  const full = await prisma.collection.findUnique({
    where: { id: collection.id },
    include: collectionInclude,
  });
  return c.json({ collection: full }, 201);
});

p1.get("/collections/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const collection = await prisma.collection.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: collectionInclude,
  });
  if (!collection) return c.json({ error: "Not found" }, 404);
  return c.json({ collection });
});

p1.patch("/collections/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    title?: string;
    slug?: string;
    description?: string | null;
    ruleType?: string;
    ruleTag?: string;
    ruleProductType?: string;
    productIds?: string[];
  }>();
  const collection = await prisma.collection.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);

  const title = body.title ? String(body.title).trim() : collection.title;
  const slug = body.slug ? normalizeSlug(body.slug) : collection.slug;
  if (slug !== collection.slug) {
    const dup = await prisma.collection.findFirst({
      where: { tenantId: tenant.id, slug, NOT: { id: collection.id } },
    });
    if (dup) return c.json({ error: "Slug already used" }, 400);
  }

  const rulePatch =
    body.ruleType !== undefined ||
    body.ruleTag !== undefined ||
    body.ruleProductType !== undefined ||
    body.description !== undefined
      ? collectionRuleData({
          ruleType: body.ruleType ?? collection.ruleType,
          ruleTag: body.ruleTag ?? collection.ruleTag ?? undefined,
          ruleProductType:
            body.ruleProductType ?? collection.ruleProductType ?? undefined,
          description:
            body.description !== undefined ? body.description : collection.description,
        })
      : {};

  await prisma.collection.update({
    where: { id: collection.id },
    data: { title, slug, ...rulePatch },
  });

  if (body.productIds) {
    await syncCollectionProducts(collection.id, body.productIds);
  }

  const updated = await prisma.collection.findUnique({
    where: { id: collection.id },
    include: collectionInclude,
  });
  return c.json({ collection: updated });
});

p1.delete("/collections/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const collection = await prisma.collection.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);
  await prisma.collection.delete({ where: { id: collection.id } });
  return c.json({ ok: true });
});

// ——— Shipping ———
p1.get("/shipping-zones", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const zones = await prisma.shippingZone.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });
  return c.json({ zones, currency: tenant.settings?.currency ?? "USD" });
});

p1.post("/shipping-zones", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<Record<string, unknown>>();
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "Name required" }, 400);
  const countries = Array.isArray(body.countries)
    ? (body.countries as string[]).map((x) => String(x).toUpperCase().slice(0, 2))
    : String(body.countries ?? "")
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter((x) => x.length === 2);

  const zone = await prisma.shippingZone.create({
    data: {
      tenantId: tenant.id,
      name,
      countries,
      flatRateAmount: Math.round(parseFloat(String(body.flatRate ?? "0")) * 100),
      freeShippingThreshold: body.freeShippingThreshold
        ? Math.round(parseFloat(String(body.freeShippingThreshold)) * 100)
        : null,
      perKgAmount: body.perKgAmount
        ? Math.round(parseFloat(String(body.perKgAmount)) * 100)
        : null,
      currency: tenant.settings?.currency ?? "USD",
    },
  });
  return c.json({ zone }, 201);
});

p1.patch("/shipping-zones/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const zone = await prisma.shippingZone.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!zone) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const countries = body.countries
    ? Array.isArray(body.countries)
      ? (body.countries as string[]).map((x) => String(x).toUpperCase().slice(0, 2))
      : String(body.countries)
          .split(",")
          .map((x) => x.trim().toUpperCase())
          .filter((x) => x.length === 2)
    : zone.countries;

  const updated = await prisma.shippingZone.update({
    where: { id: zone.id },
    data: {
      name: body.name ? String(body.name).trim() : zone.name,
      countries,
      flatRateAmount:
        body.flatRate != null
          ? Math.round(parseFloat(String(body.flatRate)) * 100)
          : zone.flatRateAmount,
      freeShippingThreshold:
        body.freeShippingThreshold === null || body.freeShippingThreshold === ""
          ? null
          : body.freeShippingThreshold != null
            ? Math.round(parseFloat(String(body.freeShippingThreshold)) * 100)
            : zone.freeShippingThreshold,
      perKgAmount:
        body.perKgAmount === null || body.perKgAmount === ""
          ? null
          : body.perKgAmount != null
            ? Math.round(parseFloat(String(body.perKgAmount)) * 100)
            : zone.perKgAmount,
    },
  });
  return c.json({ zone: updated });
});

p1.delete("/shipping-zones/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const zone = await prisma.shippingZone.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!zone) return c.json({ error: "Not found" }, 404);
  await prisma.shippingZone.delete({ where: { id: zone.id } });
  return c.json({ ok: true });
});

// ——— Product images ———
p1.post("/products/:id/images", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { images: true },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  const form = await c.req.parseBody();
  const f = form.image;
  const file = f instanceof File && f.size > 0 ? f : null;
  if (!file) return c.json({ error: "Image file required" }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await saveProductImage(tenant.id, product.id, {
    name: file.name,
    type: file.type,
    size: file.size,
    buffer,
  });

  const image = await prisma.productImage.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      storageKey: meta.storageKey,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      sortOrder: product.images.length,
      alt: form.alt ? String(form.alt) : null,
    },
  });
  return c.json({ image: { ...image, url: uploadPublicUrl(image.storageKey) } }, 201);
});

p1.delete("/products/:productId/images/:imageId", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const image = await prisma.productImage.findFirst({
    where: {
      id: c.req.param("imageId"),
      productId: c.req.param("productId"),
      tenantId: tenant.id,
    },
  });
  if (!image) return c.json({ error: "Not found" }, 404);
  await prisma.productImage.delete({ where: { id: image.id } });
  return c.json({ ok: true });
});

// ——— Variants sync (called from product patch body) ———
p1.put("/products/:id/variants", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  const { variants } = await c.req.json<{ variants: unknown }>();
  await syncProductVariants(tenant.id, product.id, parseVariantsJson(variants));
  const list = await prisma.productVariant.findMany({
    where: { productId: product.id },
    orderBy: { title: "asc" },
  });
  return c.json({ variants: list });
});

// ——— Orders: timeline, notes, export, documents, resend ———
p1.get("/orders/:id/events", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  const events = await prisma.orderEvent.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ events });
});

p1.post("/orders/:id/notes", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const { body: noteBody } = await c.req.json<{ body: string }>();
  const text = String(noteBody ?? "").trim();
  if (!text) return c.json({ error: "Note cannot be empty" }, 400);

  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  const event = await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "NOTE",
      body: text,
      authorEmail: user?.email,
    },
  });
  return c.json({ event }, 201);
});

async function loadOrderDoc(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: true,
      items: true,
      tenant: { include: { settings: true } },
    },
  });
}

function orderDocPayload(order: NonNullable<Awaited<ReturnType<typeof loadOrderDoc>>>) {
  const s = order.tenant.settings;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    createdAt: order.createdAt,
    tenantName: order.tenant.name,
    contactEmail: s?.contactEmail ?? null,
    contactPhone: s?.contactPhone ?? null,
    businessAddress: s?.businessAddress ?? null,
    customerEmail: order.customer?.email ?? null,
    customerName: order.customer?.name ?? null,
    shippingCountry: order.shippingCountry,
    subtotalAmount: order.subtotalAmount,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    items: order.items,
  };
}

p1.get("/orders/:id/invoice", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await loadOrderDoc(tenant.id, c.req.param("id"));
  if (!order) return c.json({ error: "Not found" }, 404);
  const html = renderOrderHtml(orderDocPayload(order), "invoice");
  return c.html(html);
});

p1.get("/orders/:id/packing-slip", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await loadOrderDoc(tenant.id, c.req.param("id"));
  if (!order) return c.json({ error: "Not found" }, 404);
  const html = renderOrderHtml(orderDocPayload(order), "packing");
  return c.html(html);
});

p1.post("/orders/:id/resend-receipt", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { customer: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  try {
    await sendCustomerOrderReceipt(order.id);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Email failed" },
      400
    );
  }

  const session = c.get("session");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "EMAIL_SENT",
      body: "Receipt email sent to customer",
      authorEmail: user?.email,
      meta: { to: order.customer?.email },
    },
  });
  return c.json({ ok: true });
});

// ——— Staff ———
function serializeMember(
  m: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    createdAt: Date;
    acceptedAt: Date | null;
    inviteExpiresAt: Date | null;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null } | null;
  }
) {
  const expired = isInviteExpired(m);
  return {
    id: m.id,
    userId: m.user?.id ?? null,
    email: m.email,
    role: m.role,
    permissions: m.permissions,
    createdAt: m.createdAt.toISOString(),
    acceptedAt: m.acceptedAt?.toISOString() ?? null,
    inviteExpiresAt: m.inviteExpiresAt?.toISOString() ?? null,
    inviteExpired: expired,
    pending: !m.acceptedAt,
    user: m.user
      ? {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          avatarUrl: m.user.avatarUrl,
        }
      : null,
  };
}

p1.get("/staff", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const members = await prisma.tenantMember.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const owner = await prisma.user.findUnique({
    where: { id: tenant.ownerId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  return c.json({
    owner: owner ? { ...owner, id: tenant.ownerId } : null,
    members: members.map(serializeMember),
    currentUserId: session.sub,
    isOwner: tenant.ownerId === session.sub,
  });
});

p1.post("/staff/invite", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const ownerGate = await requireOwnerAccess(session, tenant.id);
  if (!ownerGate.ok) return c.json({ error: ownerGate.error }, 403);

  const body = await c.req.json<{
    email: string;
    role?: TenantMemberRole;
    permissions?: string[];
  }>();
  const emailNorm = String(body.email ?? "").trim().toLowerCase();
  if (!emailNorm) return c.json({ error: "Email required" }, 400);
  const memberRole =
    body.role && Object.values(TenantMemberRole).includes(body.role)
      ? body.role
      : TenantMemberRole.STAFF;
  if (memberRole === TenantMemberRole.OWNER) {
    return c.json({ error: "Cannot assign OWNER via invite" }, 400);
  }

  const existing = await prisma.tenantMember.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: emailNorm } },
  });
  if (existing) return c.json({ error: "Already invited" }, 400);

  const inviteUser = await prisma.user.findUnique({ where: { email: emailNorm } });
  const inviteToken = randomBytes(24).toString("hex");
  const expires = inviteExpiresAt();
  const perms =
    memberRole === TenantMemberRole.STAFF
      ? sanitizeStaffPermissions(body.permissions ?? [])
      : [];

  const member = await prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      email: emailNorm,
      userId: inviteUser?.id ?? null,
      role: memberRole,
      permissions: perms,
      inviteToken,
      inviteExpiresAt: expires,
      acceptedAt: inviteUser ? new Date() : null,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
  });

  const inviteLink = buildInviteLink(inviteToken);
  const inviter = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  const emailSent = inviteUser
    ? false
    : await sendStaffInviteEmail({
        to: emailNorm,
        storeName: tenant.name,
        role: memberRole,
        inviteLink,
        inviterEmail: inviter?.email ?? "owner",
      });

  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail: inviter?.email ?? session.email,
    action: "staff.invite",
    entityType: "staff",
    entityId: member.id,
    summary: `Invited ${emailNorm} as ${memberRole}`,
  });

  return c.json({
    member: serializeMember(member),
    inviteLink,
    emailSent,
  });
});

p1.post("/staff/:id/resend", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const ownerGate = await requireOwnerAccess(session, tenant.id);
  if (!ownerGate.ok) return c.json({ error: ownerGate.error }, 403);

  const member = await prisma.tenantMember.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
  });
  if (!member) return c.json({ error: "Not found" }, 404);
  if (member.acceptedAt) {
    return c.json({ error: "Member already accepted" }, 400);
  }

  const inviteToken = randomBytes(24).toString("hex");
  const expires = inviteExpiresAt();
  const updated = await prisma.tenantMember.update({
    where: { id: member.id },
    data: { inviteToken, inviteExpiresAt: expires },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
  });

  const inviteLink = buildInviteLink(inviteToken);
  const inviter = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  const emailSent = await sendStaffInviteEmail({
    to: member.email,
    storeName: tenant.name,
    role: member.role,
    inviteLink,
    inviterEmail: inviter?.email ?? "owner",
  });

  return c.json({
    member: serializeMember(updated),
    inviteLink,
    emailSent,
  });
});

p1.delete("/staff/:id", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const ownerGate = await requireOwnerAccess(session, tenant.id);
  if (!ownerGate.ok) return c.json({ error: ownerGate.error }, 403);

  const member = await prisma.tenantMember.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!member) return c.json({ error: "Not found" }, 404);

  await prisma.tenantMember.delete({ where: { id: member.id } });
  const inviter = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail: inviter?.email ?? session.email,
    action: member.acceptedAt ? "staff.remove" : "staff.revoke",
    entityType: "staff",
    summary: member.acceptedAt
      ? `Removed ${member.email}`
      : `Revoked invite for ${member.email}`,
  });
  return c.json({ ok: true });
});

p1.post("/staff/transfer-ownership", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const ownerGate = await requireOwnerAccess(session, tenant.id);
  if (!ownerGate.ok) return c.json({ error: ownerGate.error }, 403);

  const { email } = await c.req.json<{ email: string }>();
  const emailNorm = String(email ?? "").trim().toLowerCase();
  if (!emailNorm) return c.json({ error: "Email required" }, 400);

  const targetUser = await prisma.user.findUnique({
    where: { email: emailNorm },
  });
  if (!targetUser) {
    return c.json({ error: "User must have an account and accept invite first" }, 400);
  }

  const member = await prisma.tenantMember.findFirst({
    where: {
      tenantId: tenant.id,
      email: emailNorm,
      acceptedAt: { not: null },
    },
  });
  if (!member) {
    return c.json({ error: "User must be an active team member" }, 400);
  }
  if (targetUser.id === tenant.ownerId) {
    return c.json({ error: "Already the owner" }, 400);
  }

  const oldOwnerId = tenant.ownerId;
  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { ownerId: targetUser.id },
    });
    await tx.tenantMember.delete({ where: { id: member.id } });
    const oldOwner = await tx.user.findUnique({
      where: { id: oldOwnerId },
      select: { email: true },
    });
    if (oldOwner) {
      await tx.tenantMember.upsert({
        where: {
          tenantId_email: { tenantId: tenant.id, email: oldOwner.email },
        },
        create: {
          tenantId: tenant.id,
          email: oldOwner.email,
          userId: oldOwnerId,
          role: TenantMemberRole.ADMIN,
          acceptedAt: new Date(),
          permissions: [],
        },
        update: {
          userId: oldOwnerId,
          role: TenantMemberRole.ADMIN,
          acceptedAt: new Date(),
        },
      });
    }
  });

  const inviter = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  await logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail: inviter?.email ?? session.email,
    action: "staff.transfer_ownership",
    summary: `Ownership transferred to ${emailNorm}`,
  });

  return c.json({ ok: true, newOwnerEmail: emailNorm });
});

p1.post("/staff/accept-invite", async (c) => {
  const session = c.get("session");
  const { token } = await c.req.json<{ token: string }>();
  const member = await prisma.tenantMember.findFirst({
    where: { inviteToken: String(token ?? "") },
  });
  if (!member) return c.json({ error: "Invalid invite" }, 400);
  if (isInviteExpired(member)) {
    return c.json({ error: "Invite expired. Ask the store owner to resend." }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.email.toLowerCase() !== member.email.toLowerCase()) {
    return c.json({ error: "Invite email does not match your account" }, 400);
  }

  await prisma.tenantMember.update({
    where: { id: member.id },
    data: {
      userId: user.id,
      acceptedAt: new Date(),
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });
  return c.json({ ok: true });
});

export { p1, parseVariantsJson, syncProductVariants, mapProductImages };
