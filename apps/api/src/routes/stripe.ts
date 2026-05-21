import { Hono } from "hono";
import { prisma } from "@ugclab/database";
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
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";

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
    console.error("[stripe webhook]", event.type, e);
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

  if (event.type === "account.updated") {
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

const merchantStripe = new Hono<AuthEnv>();
merchantStripe.use("*", requireAuth);

merchantStripe.get("/status", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const configured = isStripeConfigured();

  if (!configured) {
    return c.json({
      configured: false,
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      stripeAccountId: null,
      platformFeeBps: tenant.platformFeeBpsOverride ?? null,
      planFeeBps: null,
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

  const full = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: true },
  });

  return c.json({
    configured: true,
    connected: Boolean(tenant.stripeAccountId),
    chargesEnabled,
    detailsSubmitted,
    stripeAccountId: tenant.stripeAccountId,
    platformFeeBps:
      full?.platformFeeBpsOverride ?? full?.subscriptionPlan?.platformFeeBps ?? 500,
    planFeeBps: full?.subscriptionPlan?.platformFeeBps ?? 500,
    paymentsReady: Boolean(tenant.stripeAccountId && chargesEnabled),
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
