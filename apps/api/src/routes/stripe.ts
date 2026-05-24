import { Hono } from "hono";
import { OrderStatus, prisma } from "@ugclab/database";
import type Stripe from "stripe";
import { fulfillPaidOrder } from "../lib/fulfill-order.js";
import { requireTenant } from "../lib/merchant.js";
import {
  clearTenantSubscription,
  createPlatformSubscriptionCheckout,
  syncTenantSubscription,
} from "../lib/platform-billing.js";
import {
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "../lib/stripe.js";
import { MERCHANT_WEB_URL } from "../env.js";
import { getPaymentModel, isMorPaymentModel } from "../lib/payment-model.js";
import { getMerchantBalance } from "../lib/merchant-balance.js";
import { markOrderRefunded } from "../lib/stripe-refund.js";
import { handleStripeDispute } from "../lib/stripe-disputes.js";
import {
  assertMorPayoutAmount,
  getMorPayoutMinCents,
  getMorPayoutScheduleLabel,
} from "../lib/mor-payout-config.js";
import { payoutsToCsv } from "../lib/payout-csv.js";
import {
  isTaxFormType,
  maskTaxFormId,
  normalizePayoutCurrency,
} from "../lib/payout-profile.js";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import {
  useOwnerOnlyStripeGuards,
  usePayout2faGuards,
} from "../middleware/merchant-guards.js";

const stripeRoutes = new Hono();

stripeRoutes.post("/webhook", async (c) => {
  if (!isStripeConfigured()) {
    return c.text("Stripe not configured", 503);
  }
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.text("Missing signature", 400);

  const rawBody = await c.req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      getStripeWebhookSecret()
    );
  } catch (e) {
    console.error("[stripe webhook] verify failed", e);
    return c.text("Invalid signature", 400);
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (existing?.processed) {
    return c.json({ received: true, duplicate: true });
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type, processed: false },
    update: {},
  });

  try {
    await handleStripeEvent(event);
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe webhook]", event.type, e);
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processed: false, error: msg.slice(0, 2000) },
    });
    return c.text("Handler error", 500);
  }

  return c.json({ received: true });
});

async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.type === "platform_subscription") {
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subId) {
        const sub = await getStripe().subscriptions.retrieve(subId);
        await syncTenantSubscription(sub);
      }
      return;
    }
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    await fulfillPaidOrder(orderId, {
      stripePaymentId: paymentIntentId ?? session.id,
      platformFeeAmount: order.platformFeeAmount,
    });
    return;
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    await syncTenantSubscription(sub);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const tenantId = sub.metadata?.tenantId;
    if (tenantId) await clearTenantSubscription(tenantId);
    return;
  }

  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.updated" ||
    event.type === "charge.dispute.closed"
  ) {
    await handleStripeDispute(event.data.object as Stripe.Dispute);
    return;
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const order = await prisma.order.findFirst({
      where: { stripePaymentId: paymentIntentId },
    });
    if (!order || order.status === OrderStatus.REFUNDED) return;

    const refunded = charge.amount_refunded ?? 0;
    const partial = refunded > 0 && refunded < order.totalAmount;
    if (partial) {
      await prisma.orderEvent.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          type: "STATUS_CHANGE",
          body: `Partial refund ${refunded / 100} confirmed via Stripe`,
          meta: { partial: true, refundAmountCents: refunded },
        },
      });
      return;
    }

    await markOrderRefunded(order.id, {
      stripeNote: "Refund confirmed via Stripe",
    });
    return;
  }

  if (event.type === "account.updated") {
    if (!isMorPaymentModel()) {
      const account = event.data.object as Stripe.Account;
      await prisma.tenant.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          stripeChargesEnabled: account.charges_enabled ?? false,
          stripeDetailsSubmitted: account.details_submitted ?? false,
        },
      });
    }
  }
}

const merchantStripe = new Hono<AuthEnv>();
merchantStripe.use("*", requireAuth);
useOwnerOnlyStripeGuards(merchantStripe);
usePayout2faGuards(merchantStripe);

merchantStripe.get("/status", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const configured = isStripeConfigured();
  const paymentModel = getPaymentModel();

  const full = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: true },
  });
  const platformFeeBps =
    full?.platformFeeBpsOverride ?? full?.subscriptionPlan?.platformFeeBps ?? 500;

  if (!configured) {
    return c.json({
      configured: false,
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      stripeAccountId: null,
      platformFeeBps: tenant.platformFeeBpsOverride ?? null,
      planFeeBps: null,
      paymentModel,
      paymentsReady: false,
    });
  }

  if (isMorPaymentModel()) {
    return c.json({
      configured: true,
      connected: true,
      chargesEnabled: true,
      detailsSubmitted: true,
      stripeAccountId: null,
      platformFeeBps,
      planFeeBps: full?.subscriptionPlan?.platformFeeBps ?? 500,
      paymentModel: "mor",
      paymentsReady: true,
    });
  }

  let chargesEnabled = tenant.stripeChargesEnabled;
  let detailsSubmitted = tenant.stripeDetailsSubmitted;

  if (tenant.stripeAccountId) {
    try {
      const account = await getStripe().accounts.retrieve(tenant.stripeAccountId);
      chargesEnabled = account.charges_enabled ?? false;
      detailsSubmitted = account.details_submitted ?? false;
      if (
        chargesEnabled !== tenant.stripeChargesEnabled ||
        detailsSubmitted !== tenant.stripeDetailsSubmitted
      ) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripeChargesEnabled: chargesEnabled, stripeDetailsSubmitted: detailsSubmitted },
        });
      }
    } catch (e) {
      console.error("[stripe] account retrieve", e);
    }
  }

  return c.json({
    configured: true,
    connected: Boolean(tenant.stripeAccountId),
    chargesEnabled,
    detailsSubmitted,
    stripeAccountId: tenant.stripeAccountId,
    platformFeeBps,
    planFeeBps: full?.subscriptionPlan?.platformFeeBps ?? 500,
    paymentModel: "connect",
    paymentsReady: Boolean(tenant.stripeAccountId && chargesEnabled),
  });
});

merchantStripe.get("/mor-balance", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "Not available in Connect mode" }, 404);
  }
  const { tenant } = await requireTenant(c.get("session"));
  const balance = await getMerchantBalance(tenant.id);
  return c.json({
    paymentModel: "mor",
    currency: balance.currency,
    storefrontCurrency: balance.storefrontCurrency,
    payoutCurrency: balance.payoutCurrency,
    earnedCents: balance.earnedCents,
    platformFeesCents: balance.platformFeesCents,
    paidOutCents: balance.paidOutCents,
    pendingPayoutCents: balance.pendingPayoutCents,
    availableCents: balance.availableCents,
    payoutMinCents: getMorPayoutMinCents(),
    payoutSchedule: getMorPayoutScheduleLabel(),
    payouts: balance.payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      note: p.note,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

merchantStripe.post("/mor-payout-request", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "Not available in Connect mode" }, 404);
  }
  const { tenant } = await requireTenant(c.get("session"));
  const body = (await c.req.json<{ amountCents?: number; note?: string }>()) as {
    amountCents?: number;
    note?: string;
  };
  const balance = await getMerchantBalance(tenant.id);
  const amount =
    body.amountCents != null && body.amountCents > 0
      ? Math.min(body.amountCents, balance.availableCents)
      : balance.availableCents;
  if (amount <= 0) {
    return c.json({ error: "No balance available for payout" }, 400);
  }
  const minErr = assertMorPayoutAmount(amount);
  if (minErr) return c.json({ error: minErr }, 400);
  const payout = await prisma.merchantPayout.create({
    data: {
      tenantId: tenant.id,
      amount,
      currency: balance.currency,
      status: "PENDING",
      note: body.note?.trim() || "Payout requested by merchant",
    },
  });
  const { notifyMerchantPayoutRequested, notifyPlatformPayoutRequested } =
    await import("../lib/payout-emails.js");
  await Promise.all([
    notifyMerchantPayoutRequested({
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount,
      currency: balance.currency,
      payoutId: payout.id,
    }),
    notifyPlatformPayoutRequested({
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      amount,
      currency: balance.currency,
      payoutId: payout.id,
    }),
  ]);
  return c.json({ payout }, 201);
});

merchantStripe.get("/mor-payouts/export.csv", async (c) => {
  if (!isMorPaymentModel()) return c.json({ error: "MoR only" }, 404);
  const { tenant } = await requireTenant(c.get("session"));
  const csv = await payoutsToCsv({ tenantId: tenant.id });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payouts-${tenant.slug}.csv"`,
    },
  });
});

merchantStripe.get("/payouts", async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ configured: false, balance: null, payouts: [] });
  }
  const { tenant } = await requireTenant(c.get("session"));
  if (!tenant.stripeAccountId) {
    return c.json({
      configured: true,
      connected: false,
      balance: null,
      payouts: [],
    });
  }

  const stripe = getStripe();
  const opts = { stripeAccount: tenant.stripeAccountId };

  const [balance, payoutsList, pending] = await Promise.all([
    stripe.balance.retrieve(opts),
    stripe.payouts.list({ limit: 12 }, opts),
    stripe.balanceTransactions.list({ limit: 5, type: "payout" }, opts).catch(() => null),
  ]);

  const available = balance.available.reduce(
    (s, b) => s + b.amount,
    0
  );
  const pendingAmount = balance.pending.reduce((s, b) => s + b.amount, 0);
  const currency = balance.available[0]?.currency ?? tenant.settings?.currency ?? "usd";

  return c.json({
    configured: true,
    connected: true,
    currency: currency.toUpperCase(),
    balance: {
      available,
      pending: pendingAmount,
    },
    payouts: payoutsList.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      arrivalDate: p.arrival_date
        ? new Date(p.arrival_date * 1000).toISOString()
        : null,
      createdAt: new Date(p.created * 1000).toISOString(),
    })),
    recentPayoutTransactions: pending?.data?.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
    })),
  });
});

merchantStripe.get("/payout-profile", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const s = tenant.settings;
  const storefrontCurrency = s?.currency ?? "USD";
  const payoutCurrency =
    s?.payoutCurrency?.trim().toUpperCase() || storefrontCurrency;
  return c.json({
    paymentModel: getPaymentModel(),
    storefrontCurrency,
    payoutCurrency,
    taxFormType: s?.taxFormType ?? null,
    taxFormLegalName: s?.taxFormLegalName ?? null,
    taxFormIdMasked: maskTaxFormId(s?.taxFormId),
    hasTaxForm: Boolean(
      s?.taxFormType && s?.taxFormLegalName?.trim() && s?.taxFormId?.trim()
    ),
    notifyPayoutFailed: s?.notifyPayoutFailed !== false,
  });
});

merchantStripe.patch("/payout-profile", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    payoutCurrency?: string | null;
    taxFormType?: string | null;
    taxFormLegalName?: string | null;
    taxFormId?: string | null;
    notifyPayoutFailed?: boolean;
  }>();
  const storefrontCurrency = tenant.settings?.currency ?? "USD";

  const payoutCurrency =
    body.payoutCurrency !== undefined
      ? normalizePayoutCurrency(body.payoutCurrency, storefrontCurrency)
      : tenant.settings?.payoutCurrency ?? null;

  let taxFormType: string | null =
    tenant.settings?.taxFormType ?? null;
  let taxFormLegalName: string | null =
    tenant.settings?.taxFormLegalName ?? null;
  let taxFormId: string | null = tenant.settings?.taxFormId ?? null;

  if (body.taxFormType !== undefined) {
    const t = body.taxFormType ? String(body.taxFormType).trim() : "";
    taxFormType = t && isTaxFormType(t) ? t : null;
    if (!taxFormType) {
      taxFormLegalName = null;
      taxFormId = null;
    }
  }
  if (body.taxFormLegalName !== undefined) {
    taxFormLegalName = body.taxFormLegalName
      ? String(body.taxFormLegalName).trim().slice(0, 200)
      : null;
  }
  if (body.taxFormId !== undefined) {
    taxFormId = body.taxFormId
      ? String(body.taxFormId).trim().slice(0, 64)
      : null;
  }

  if (taxFormType && (!taxFormLegalName || !taxFormId)) {
    return c.json(
      { error: "Legal name and tax ID are required when form type is set" },
      400
    );
  }

  const notifyPayoutFailed =
    body.notifyPayoutFailed !== undefined
      ? Boolean(body.notifyPayoutFailed)
      : (tenant.settings?.notifyPayoutFailed ?? true);

  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      currency: storefrontCurrency,
      payoutCurrency: payoutCurrency ?? null,
      taxFormType,
      taxFormLegalName,
      taxFormId,
      notifyPayoutFailed,
    },
    update: {
      ...(body.payoutCurrency !== undefined ? { payoutCurrency } : {}),
      ...(body.taxFormType !== undefined
        ? { taxFormType, taxFormLegalName, taxFormId }
        : {}),
      ...(body.notifyPayoutFailed !== undefined ? { notifyPayoutFailed } : {}),
    },
  });

  const updated = await requireTenant(c.get("session"));
  const s = updated.tenant.settings;
  return c.json({
    ok: true,
    storefrontCurrency: s?.currency ?? "USD",
    payoutCurrency:
      s?.payoutCurrency?.trim().toUpperCase() ?? s?.currency ?? "USD",
    taxFormType: s?.taxFormType ?? null,
    taxFormLegalName: s?.taxFormLegalName ?? null,
    taxFormIdMasked: maskTaxFormId(s?.taxFormId),
    hasTaxForm: Boolean(
      s?.taxFormType && s?.taxFormLegalName?.trim() && s?.taxFormId?.trim()
    ),
    notifyPayoutFailed: s?.notifyPayoutFailed !== false,
  });
});

merchantStripe.get("/billing/invoices", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  if (!isStripeConfigured() || !tenant.stripeBillingCustomerId) {
    return c.json({ configured: isStripeConfigured(), invoices: [] });
  }
  const list = await getStripe().invoices.list({
    customer: tenant.stripeBillingCustomerId,
    limit: 24,
  });
  return c.json({
    configured: true,
    invoices: list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      currency: inv.currency.toUpperCase(),
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      createdAt: new Date(inv.created * 1000).toISOString(),
      periodStart: inv.period_start
        ? new Date(inv.period_start * 1000).toISOString()
        : null,
      periodEnd: inv.period_end
        ? new Date(inv.period_end * 1000).toISOString()
        : null,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    })),
  });
});

merchantStripe.get("/billing", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthly: "asc" },
  });
  const owner = await prisma.user.findUnique({ where: { id: session.sub } });
  const full = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: true },
  });

  return c.json({
    configured: isStripeConfigured(),
    subscription: {
      status: full?.subscriptionStatus ?? (full?.subscriptionPlan ? "active" : "none"),
      plan: full?.subscriptionPlan,
      trialEndsAt: full?.trialEndsAt,
      stripeSubscriptionId: full?.stripeSubscriptionId,
    },
    plans: plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      productLimit: p.productLimit,
      platformFeeBps: p.platformFeeBps,
      trialDays: p.trialDays,
      isCurrent: p.id === full?.subscriptionPlanId,
    })),
    ownerEmail: owner?.email,
  });
});

merchantStripe.post("/billing/checkout", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ planId: string }>();
  const owner = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!owner?.email) return c.json({ error: "Owner email required" }, 400);

  try {
    const { url } = await createPlatformSubscriptionCheckout(
      tenant.id,
      body.planId,
      owner.email
    );
    return c.json({ url });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      400
    );
  }
});

merchantStripe.post("/billing/portal", async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ error: "Stripe not configured" }, 503);
  }
  const { tenant } = await requireTenant(c.get("session"));
  if (!tenant.stripeBillingCustomerId) {
    return c.json({ error: "Subscribe to a plan first" }, 400);
  }
  const portal = await getStripe().billingPortal.sessions.create({
    customer: tenant.stripeBillingCustomerId,
    return_url: `${MERCHANT_WEB_URL}/settings?tab=billing`,
  });
  return c.json({ url: portal.url });
});

merchantStripe.post("/connect", async (c) => {
  if (isMorPaymentModel()) {
    return c.json(
      {
        error:
          "Stripe Connect is disabled. Platform uses MoR — payments go to UGCLab Stripe.",
      },
      400
    );
  }
  if (!isStripeConfigured()) {
    return c.json({ error: "Stripe is not configured on the platform" }, 503);
  }
  const { tenant, session } = await requireTenant(c.get("session"));
  const stripe = getStripe();

  const owner = await prisma.user.findUnique({ where: { id: session.sub } });
  const country = (owner?.country ?? "US").toUpperCase().slice(0, 2);

  let accountId = tenant.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: owner?.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
    });
    accountId = account.id;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeAccountId: accountId },
    });
  }

  const returnUrl = `${MERCHANT_WEB_URL}/settings?stripe=return`;
  const refreshUrl = `${MERCHANT_WEB_URL}/settings?stripe=refresh`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return c.json({ url: link.url, stripeAccountId: accountId });
});

merchantStripe.post("/dashboard-link", async (c) => {
  if (isMorPaymentModel()) {
    return c.json({ error: "Use platform MoR payouts, not Connect dashboard" }, 400);
  }
  if (!isStripeConfigured()) {
    return c.json({ error: "Stripe is not configured" }, 503);
  }
  const { tenant } = await requireTenant(c.get("session"));
  if (!tenant.stripeAccountId) {
    return c.json({ error: "Connect Stripe first" }, 400);
  }
  const login = await getStripe().accounts.createLoginLink(tenant.stripeAccountId);
  return c.json({ url: login.url });
});

export { stripeRoutes, merchantStripe };
