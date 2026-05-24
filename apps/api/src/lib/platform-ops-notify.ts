import { sendEmail } from "./email.js";

const OPS_EMAIL = () => process.env.PLATFORM_OPS_EMAIL?.trim() || null;

export async function notifyPlatformOps(opts: {
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const to = OPS_EMAIL();
  if (!to) return false;
  try {
    await sendEmail({
      to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      template: "ops-alert",
    });
    return true;
  } catch (e) {
    console.error("[ops-notify]", e);
    return false;
  }
}

export async function notifyPayoutRequest(
  tenantName: string,
  amountCents: number,
  currency: string
) {
  await notifyPlatformOps({
    subject: `[Tescommerce] Payout request — ${tenantName}`,
    html: `<p>Merchant <strong>${tenantName}</strong> requested payout <strong>${(amountCents / 100).toFixed(2)} ${currency}</strong>.</p><p><a href="${process.env.PLATFORM_ADMIN_URL ?? "http://localhost:3003"}/payouts">Open payouts</a></p>`,
    text: `Payout request from ${tenantName}: ${amountCents / 100} ${currency}`,
  });
}

export async function notifyDispute(tenantName: string, orderNumber: string) {
  await notifyPlatformOps({
    subject: `[Tescommerce] Dispute — ${tenantName} #${orderNumber}`,
    html: `<p>Dispute on order <strong>#${orderNumber}</strong> for <strong>${tenantName}</strong>.</p>`,
  });
}
