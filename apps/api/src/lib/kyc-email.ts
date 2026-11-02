import { prisma } from "@ugclab/database";
import { MERCHANT_WEB_URL } from "../env.js";
import { sendEmail } from "./email.js";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** One email when Tescommerce staff approve or reject a passport. */
export async function notifyMerchantKycDecision(opts: {
  tenantId: string;
  approved: boolean;
  rejectReason?: string | null;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: { name: true, owner: { select: { email: true } } },
  });
  const to = tenant?.owner.email;
  if (!tenant || !to) return false;

  const store = esc(tenant.name);
  const paymentsUrl = `${MERCHANT_WEB_URL}/payments#passport-kyc`;
  const reason = opts.rejectReason?.trim();
  const subject = opts.approved
    ? `Passport check approved — ${tenant.name}`
    : `Passport check rejected — ${tenant.name}`;
  const lead = opts.approved
    ? `Tescommerce approved the passport for <strong>${store}</strong>. You can request a payout.`
    : `Tescommerce rejected the passport for <strong>${store}</strong>.`;
  const reasonHtml =
    !opts.approved && reason
      ? `<p><strong>Reason:</strong> ${esc(reason)}</p>`
      : "";
  const next = opts.approved
    ? `<p><a href="${esc(paymentsUrl)}">Open Payments</a> to request a payout.</p>`
    : `<p>Submit the passport again: <a href="${esc(paymentsUrl)}">Payments</a>.</p>`;

  await sendEmail({
    to,
    subject,
    template: opts.approved ? "kyc.approved" : "kyc.rejected",
    html: `
      <h2>${opts.approved ? "Passport check approved" : "Passport check rejected"}</h2>
      <p>${lead}</p>
      ${reasonHtml}
      <p>Tescommerce staff review this document. Finik, Stripe, and Wise do not.</p>
      ${next}
    `,
    text: opts.approved
      ? `Tescommerce approved the passport for ${tenant.name}. Request a payout: ${paymentsUrl}`
      : `Tescommerce rejected the passport for ${tenant.name}. Reason: ${reason ?? ""}. Submit again: ${paymentsUrl}`,
  });
  return true;
}
