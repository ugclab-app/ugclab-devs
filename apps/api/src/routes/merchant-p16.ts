import { Hono } from "hono";
import {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  prisma,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  getMerchantAccess,
  hasPermission,
  requireOwnerAccess,
  type MerchantPermission,
} from "../lib/permissions.js";
import {
  getAffiliateProgramSettings,
  normalizeAffiliateCode,
  slugifyAffiliateCodeFromName,
} from "../lib/affiliate.js";
import {
  PLATFORM_FLAG_AFFILIATES_DISABLED,
  tenantHasPlatformFlag,
} from "../lib/platform-tenant-flags.js";
import {
  buildAffiliateCreatorEmailVars,
  isEmailProviderConfigured,
  listAffiliateCreatorEmailTemplates,
  previewAffiliateCreatorEmail,
  sendAffiliateCreatorEmail,
  type AffiliateCreatorEmailTemplateId,
} from "../lib/affiliate-creator-email.js";

const p16 = new Hono<AuthEnv>();
p16.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  return { tenant, session, access };
}

function requireGrowth(access: { permissions: MerchantPermission[] }) {
  return hasPermission(access.permissions, "growth");
}

function partnerDto(
  p: {
    id: string;
    code: string;
    displayName: string;
    email: string | null;
    commissionBps: number | null;
    status: AffiliatePartnerStatus;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  stats?: { orderCount: number; approvedCents: number; paidCents: number }
) {
  return {
    id: p.id,
    code: p.code,
    displayName: p.displayName,
    email: p.email,
    commissionBps: p.commissionBps,
    status: p.status,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    stats,
  };
}

p16.get("/affiliates/settings", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const settings = await getAffiliateProgramSettings(tenant.id);
  const platformDisabled = await tenantHasPlatformFlag(
    tenant.id,
    PLATFORM_FLAG_AFFILIATES_DISABLED
  );
  return c.json({
    settings: {
      enabled: settings.enabled && !platformDisabled,
      platformDisabled,
      defaultCommissionBps: settings.defaultCommissionBps,
      cookieDays: settings.cookieDays,
      attributionModel: settings.attributionModel,
      updatedAt: settings.updatedAt.toISOString(),
    },
  });
});

p16.patch("/affiliates/settings", async (c) => {
  const { tenant, session, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const ownerGate = await requireOwnerAccess(session, tenant.id);
  if (!ownerGate.ok) return c.json({ error: ownerGate.error }, 403);

  if (await tenantHasPlatformFlag(tenant.id, PLATFORM_FLAG_AFFILIATES_DISABLED)) {
    return c.json(
      { error: "Affiliate program is disabled by platform operations" },
      403
    );
  }

  const body = await c.req.json<Record<string, unknown>>();
  const defaultCommissionBps =
    body.defaultCommissionBps != null
      ? Math.min(5000, Math.max(0, Math.floor(Number(body.defaultCommissionBps))))
      : undefined;
  const cookieDays =
    body.cookieDays != null
      ? Math.min(90, Math.max(1, Math.floor(Number(body.cookieDays))))
      : undefined;

  const settings = await prisma.affiliateProgramSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      enabled: Boolean(body.enabled),
      ...(defaultCommissionBps != null ? { defaultCommissionBps } : {}),
      ...(cookieDays != null ? { cookieDays } : {}),
    },
    update: {
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(defaultCommissionBps != null ? { defaultCommissionBps } : {}),
      ...(cookieDays != null ? { cookieDays } : {}),
    },
  });

  return c.json({
    settings: {
      enabled: settings.enabled,
      defaultCommissionBps: settings.defaultCommissionBps,
      cookieDays: settings.cookieDays,
      attributionModel: settings.attributionModel,
      updatedAt: settings.updatedAt.toISOString(),
    },
  });
});

p16.get("/affiliates/email-templates", async (c) => {
  const { access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  return c.json({
    templates: listAffiliateCreatorEmailTemplates(),
    emailConfigured: isEmailProviderConfigured(),
  });
});

p16.get("/affiliates/partners/:id/email-preview", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const templateId = c.req.query("template") as AffiliateCreatorEmailTemplateId;
  if (!templateId) return c.json({ error: "template query required" }, 400);

  try {
    const { vars } = await buildAffiliateCreatorEmailVars(tenant.id, c.req.param("id"));
    const preview = previewAffiliateCreatorEmail(templateId, vars);
    return c.json(preview);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Preview failed" },
      400
    );
  }
});

p16.post("/affiliates/partners/:id/send-email", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{
    templateId?: AffiliateCreatorEmailTemplateId | null;
    subject?: string;
    html?: string;
    text?: string;
  }>();

  try {
    const result = await sendAffiliateCreatorEmail({
      tenantId: tenant.id,
      partnerId: c.req.param("id"),
      templateId: body.templateId ?? null,
      subject: body.subject,
      html: body.html,
      text: body.text,
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    const status = msg.includes("not configured") ? 503 : 400;
    return c.json({ error: msg }, status);
  }
});

p16.get("/affiliates/partners", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const partners = await prisma.affiliatePartner.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  const statsRows = await prisma.affiliateCommission.groupBy({
    by: ["partnerId", "status"],
    where: { tenantId: tenant.id },
    _sum: { commissionCents: true },
    _count: { _all: true },
  });

  const statsMap = new Map<
    string,
    { orderCount: number; approvedCents: number; paidCents: number }
  >();
  for (const row of statsRows) {
    const cur = statsMap.get(row.partnerId) ?? {
      orderCount: 0,
      approvedCents: 0,
      paidCents: 0,
    };
    if (row.status !== AffiliateCommissionStatus.VOID) {
      cur.orderCount += row._count._all;
    }
    if (row.status === AffiliateCommissionStatus.APPROVED) {
      cur.approvedCents += row._sum.commissionCents ?? 0;
    }
    if (row.status === AffiliateCommissionStatus.PAID) {
      cur.paidCents += row._sum.commissionCents ?? 0;
    }
    statsMap.set(row.partnerId, cur);
  }

  return c.json({
    partners: partners.map((p) =>
      partnerDto(p, statsMap.get(p.id) ?? { orderCount: 0, approvedCents: 0, paidCents: 0 })
    ),
  });
});

p16.post("/affiliates/partners", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const displayName = String(body.displayName ?? "").trim();
  if (!displayName) return c.json({ error: "displayName required" }, 400);

  let code = normalizeAffiliateCode(String(body.code ?? ""));
  if (!code) code = slugifyAffiliateCodeFromName(displayName);

  const dup = await prisma.affiliatePartner.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code } },
  });
  if (dup) return c.json({ error: "Code already in use" }, 400);

  const commissionBps =
    body.commissionBps != null && body.commissionBps !== ""
      ? Math.min(5000, Math.max(0, Math.floor(Number(body.commissionBps))))
      : null;

  const partner = await prisma.affiliatePartner.create({
    data: {
      tenantId: tenant.id,
      code,
      displayName,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      commissionBps,
      note: body.note ? String(body.note).trim() : null,
    },
  });

  return c.json({ partner: partnerDto(partner) }, 201);
});

p16.patch("/affiliates/partners/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");
  const existing = await prisma.affiliatePartner.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const data: Record<string, unknown> = {};

  if (body.displayName != null) {
    const displayName = String(body.displayName).trim();
    if (!displayName) return c.json({ error: "displayName required" }, 400);
    data.displayName = displayName;
  }
  if (body.email !== undefined) {
    data.email = body.email ? String(body.email).trim().toLowerCase() : null;
  }
  if (body.note !== undefined) {
    data.note = body.note ? String(body.note).trim() : null;
  }
  if (body.commissionBps !== undefined) {
    data.commissionBps =
      body.commissionBps === null || body.commissionBps === ""
        ? null
        : Math.min(5000, Math.max(0, Math.floor(Number(body.commissionBps))));
  }
  if (body.status != null) {
    const status = String(body.status).toUpperCase();
    if (!Object.values(AffiliatePartnerStatus).includes(status as AffiliatePartnerStatus)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    data.status = status;
  }

  const partner = await prisma.affiliatePartner.update({
    where: { id },
    data,
  });
  return c.json({ partner: partnerDto(partner) });
});

p16.delete("/affiliates/partners/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");
  const existing = await prisma.affiliatePartner.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  let code = `${existing.code}_archived`;
  const taken = await prisma.affiliatePartner.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code } },
  });
  if (taken) code = `${code}_${Date.now().toString(36)}`;

  const partner = await prisma.affiliatePartner.update({
    where: { id },
    data: { status: AffiliatePartnerStatus.PAUSED, code },
  });
  return c.json({ partner: partnerDto(partner) });
});

p16.get("/affiliates/commissions", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const partnerId = c.req.query("partnerId")?.trim();
  const status = c.req.query("status")?.trim().toUpperCase();
  const where: {
    tenantId: string;
    partnerId?: string;
    status?: AffiliateCommissionStatus;
  } = { tenantId: tenant.id };
  if (partnerId) where.partnerId = partnerId;
  if (
    status &&
    Object.values(AffiliateCommissionStatus).includes(status as AffiliateCommissionStatus)
  ) {
    where.status = status as AffiliateCommissionStatus;
  }

  const rows = await prisma.affiliateCommission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      partner: { select: { id: true, code: true, displayName: true } },
      order: { select: { id: true, orderNumber: true, status: true } },
    },
  });

  return c.json({
    commissions: rows.map((r) => ({
      id: r.id,
      partnerId: r.partnerId,
      partner: r.partner,
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      orderStatus: r.order.status,
      orderTotalCents: r.orderTotalCents,
      merchantNetCents: r.merchantNetCents,
      commissionBps: r.commissionBps,
      commissionCents: r.commissionCents,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
      payoutNote: r.payoutNote,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

p16.post("/affiliates/commissions/:id/mark-paid", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const body = (await c.req.json<{ payoutNote?: string }>().catch(() => ({}))) as {
    payoutNote?: string;
  };
  const row = await prisma.affiliateCommission.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.status === AffiliateCommissionStatus.VOID) {
    return c.json({ error: "Commission voided" }, 400);
  }
  if (row.status === AffiliateCommissionStatus.PAID) {
    return c.json({ commission: row });
  }

  const updated = await prisma.affiliateCommission.update({
    where: { id: row.id },
    data: {
      status: AffiliateCommissionStatus.PAID,
      paidAt: new Date(),
      payoutNote: body.payoutNote?.trim() || null,
    },
  });
  return c.json({ commission: updated });
});

p16.post("/affiliates/commissions/bulk-mark-paid", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ ids?: string[]; payoutNote?: string }>();
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) return c.json({ error: "ids required" }, 400);

  const result = await prisma.affiliateCommission.updateMany({
    where: {
      tenantId: tenant.id,
      id: { in: ids },
      status: AffiliateCommissionStatus.APPROVED,
    },
    data: {
      status: AffiliateCommissionStatus.PAID,
      paidAt: new Date(),
      payoutNote: body.payoutNote?.trim() || null,
    },
  });
  return c.json({ updated: result.count });
});

p16.get("/affiliates/export.csv", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const rows = await prisma.affiliateCommission.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { partner: { select: { code: true, displayName: true, email: true } } },
  });

  const header =
    "created_at,partner_code,partner_name,partner_email,order_id,order_total_cents,merchant_net_cents,commission_bps,commission_cents,status,paid_at,payout_note";
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.partner.code,
      JSON.stringify(r.partner.displayName),
      r.partner.email ?? "",
      r.orderId,
      r.orderTotalCents,
      r.merchantNetCents,
      r.commissionBps,
      r.commissionCents,
      r.status,
      r.paidAt?.toISOString() ?? "",
      JSON.stringify(r.payoutNote ?? ""),
    ].join(",")
  );
  const csv = [header, ...lines].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="affiliate-commissions-${tenant.slug}.csv"`,
    },
  });
});

export { p16 };
