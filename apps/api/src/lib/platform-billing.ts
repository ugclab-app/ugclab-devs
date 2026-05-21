import { prisma, TenantStatus } from "@ugclab/database";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "./stripe.js";
import { MERCHANT_WEB_URL } from "../env.js";

export async function getOrCreateBillingCustomer(
  tenantId: string,
  email: string,
  name: string
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  if (tenant.stripeBillingCustomerId) return tenant.stripeBillingCustomerId;

  const customer = await getStripe().customers.create({
    email,
    name,
    metadata: { tenantId, tenantSlug: tenant.slug },
  });
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripeBillingCustomerId: customer.id },
  });
  return customer.id;
}

export async function createPlatformSubscriptionCheckout(
  tenantId: string,
  planId: string,
  ownerEmail: string
): Promise<{ url: string }> {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
  ]);
  if (!tenant || !plan) throw new Error("Plan not found");

  const customerId = await getOrCreateBillingCustomer(
    tenantId,
    ownerEmail,
    tenant.name
  );

  const hadSubscription = Boolean(tenant.stripeSubscriptionId);
  const trialDays =
    !hadSubscription && plan.trialDays > 0 && plan.priceMonthly > 0
      ? plan.trialDays
      : undefined;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = plan.stripePriceId
    ? { price: plan.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: plan.currency.toLowerCase(),
          unit_amount: plan.priceMonthly,
          recurring: { interval: "month" },
          product_data: { name: `${plan.name} — UGCLab Store` },
        },
        quantity: 1,
      };

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [lineItem],
    success_url: `${MERCHANT_WEB_URL}/settings?tab=billing&billing=success`,
    cancel_url: `${MERCHANT_WEB_URL}/settings?tab=billing`,
    metadata: {
      type: "platform_subscription",
      tenantId,
      planId: plan.id,
    },
    subscription_data: {
      metadata: { tenantId, planId: plan.id },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
  });

  if (!session.url) throw new Error("Could not create checkout session");
  return { url: session.url };
}

export async function syncTenantSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  const planId = subscription.metadata?.planId;
  const status = subscription.status;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      trialEndsAt: trialEnd,
      ...(planId ? { subscriptionPlanId: planId } : {}),
      ...(status === "active" || status === "trialing"
        ? { status: TenantStatus.ACTIVE }
        : status === "past_due" || status === "unpaid"
          ? { status: TenantStatus.SUSPENDED }
          : {}),
    },
  });
}

export async function clearTenantSubscription(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
    },
  });
}
