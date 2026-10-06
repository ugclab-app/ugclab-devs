import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  getMerchantAccess,
  hasPermission,
} from "../lib/permissions.js";

/** Merchant disputes (tenant-scoped Stripe chargebacks). */
export const merchantDisputes = new Hono<AuthEnv>();
merchantDisputes.use("*", requireAuth);

merchantDisputes.get("/disputes", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "orders")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const events = await prisma.orderEvent.findMany({
    where: { tenantId: tenant.id, type: "STRIPE_DISPUTE" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          currency: true,
        },
      },
    },
  });

  return c.json({
    disputes: events.map((e) => {
      const meta = (e.meta ?? {}) as Record<string, unknown>;
      return {
        id: e.id,
        disputeId: String(meta.disputeId ?? ""),
        orderId: e.orderId,
        orderNumber: e.order.orderNumber,
        amount: Number(meta.amount ?? e.order.totalAmount),
        currency: String(meta.currency ?? e.order.currency),
        status: String(meta.status ?? "unknown"),
        reason: String(meta.reason ?? ""),
        evidenceDueBy: meta.evidenceDueBy ? String(meta.evidenceDueBy) : null,
        evidenceSubmitted: meta.evidenceSubmitted === true,
        body: e.body,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  });
});

merchantDisputes.post("/disputes/:disputeId/evidence", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "orders")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const disputeId = c.req.param("disputeId");
  if (!disputeId) return c.json({ error: "disputeId required" }, 400);

  const owned = await prisma.orderEvent.findFirst({
    where: {
      tenantId: tenant.id,
      type: "STRIPE_DISPUTE",
      meta: { path: ["disputeId"], equals: disputeId },
    },
  });
  if (!owned) {
    // Fallback: scan recent events (JSON path filter may vary by DB)
    const events = await prisma.orderEvent.findMany({
      where: { tenantId: tenant.id, type: "STRIPE_DISPUTE" },
      take: 200,
      orderBy: { createdAt: "desc" },
    });
    const hit = events.find((e) => {
      const meta = (e.meta ?? {}) as Record<string, unknown>;
      return String(meta.disputeId ?? "") === disputeId;
    });
    if (!hit) return c.json({ error: "Dispute not found for this store" }, 404);
  }

  const body = await c.req.json<Record<string, unknown>>();
  try {
    const { submitDisputeEvidence } = await import("../lib/stripe-disputes.js");
    const updated = await submitDisputeEvidence(disputeId, {
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerEmailAddress: body.customerEmailAddress
        ? String(body.customerEmailAddress)
        : undefined,
      shippingTrackingNumber: body.shippingTrackingNumber
        ? String(body.shippingTrackingNumber)
        : undefined,
      shippingCarrier: body.shippingCarrier
        ? String(body.shippingCarrier)
        : undefined,
      shippingDocumentation: body.shippingDocumentation
        ? String(body.shippingDocumentation)
        : undefined,
      productDescription: body.productDescription
        ? String(body.productDescription)
        : undefined,
      refundPolicy: body.refundPolicy ? String(body.refundPolicy) : undefined,
      uncategorizedText: body.uncategorizedText
        ? String(body.uncategorizedText)
        : undefined,
      submit: body.submit === true,
    });
    return c.json({
      ok: true,
      status: updated.status,
      disputeId: updated.id,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Evidence submit failed" },
      400
    );
  }
});
