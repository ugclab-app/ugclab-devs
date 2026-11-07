import { prisma, ProductSubscriptionStatus } from "@ugclab/database";
import { MERCHANT_WEB_URL } from "../env.js";
import { sendEmail } from "./email.js";
import { DUNNING_GAPS_DAYS, nextDunningStep } from "./billing-dunning-math.js";

export { DUNNING_GAPS_DAYS, nextDunningStep } from "./billing-dunning-math.js";

export async function processPlatformDunning(limit = 40) {
  const due = await prisma.tenant.findMany({
    where: {
      subscriptionStatus: { in: ["past_due", "unpaid"] },
      dunningStep: { lt: DUNNING_GAPS_DAYS.length },
    },
    include: {
      owner: { select: { email: true, name: true } },
      subscriptionPlan: { select: { name: true } },
    },
    take: limit,
  });

  let sent = 0;
  for (const t of due) {
    const step = nextDunningStep(t.dunningStep, t.lastDunningAt);
    if (!step) continue;
    const portal = `${MERCHANT_WEB_URL}/settings?tab=billing`;
    const plan = t.subscriptionPlan?.name ?? "your plan";
    await sendEmail({
      to: t.owner.email,
      subject:
        step >= 3
          ? `Final notice: update billing for ${t.name}`
          : `Action needed: payment failed for ${t.name}`,
      template: "platform-dunning",
      priority: step >= 2 ? "high" : "normal",
      html: `<p>Hi ${t.owner.name ?? ""},</p>
<p>We could not charge <strong>${plan}</strong> for store <strong>${t.name}</strong>.</p>
<p>Update your card here: <a href="${portal}">${portal}</a></p>
<p>Reminder ${step} of ${DUNNING_GAPS_DAYS.length}. After the final notice the store may stay suspended until payment succeeds.</p>`,
    });
    await prisma.tenant.update({
      where: { id: t.id },
      data: { dunningStep: step, lastDunningAt: new Date() },
    });
    sent += 1;
  }
  return { checked: due.length, sent };
}

/** Reset dunning when Stripe marks the subscription active again. */
export async function clearTenantDunning(tenantId: string) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { dunningStep: 0, lastDunningAt: null },
  });
}

export async function processProductSubscriptionDunning(limit = 40) {
  const rows = await prisma.productSubscription.findMany({
    where: {
      status: ProductSubscriptionStatus.PAST_DUE,
      dunningStep: { lt: DUNNING_GAPS_DAYS.length },
    },
    include: {
      customer: { select: { email: true, name: true } },
      product: { select: { title: true } },
      tenant: { select: { name: true, slug: true } },
    },
    take: limit,
  });

  let sent = 0;
  for (const sub of rows) {
    if (!sub.customer.email) continue;
    const step = nextDunningStep(sub.dunningStep, sub.lastDunningAt);
    if (!step) continue;
    await sendEmail({
      to: sub.customer.email,
      subject: `Update payment for ${sub.product.title}`,
      template: "product-sub-dunning",
      html: `<p>Hi ${sub.customer.name ?? ""},</p>
<p>Your subscription to <strong>${sub.product.title}</strong> at ${sub.tenant.name} has a failed payment.</p>
<p>Please update your payment method from your account page on the store to keep access.</p>
<p>Reminder ${step} of ${DUNNING_GAPS_DAYS.length}.</p>`,
    });
    await prisma.productSubscription.update({
      where: { id: sub.id },
      data: { dunningStep: step, lastDunningAt: new Date() },
    });
    sent += 1;
  }
  return { checked: rows.length, sent };
}
