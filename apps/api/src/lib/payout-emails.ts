import { formatMoney } from "@ugclab/i18n";
import { prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";
import { getMorPayoutScheduleLabel } from "./mor-payout-config.js";

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Requested",
  PROCESSING: "In processing",
  PAID: "Paid",
  FAILED: "Failed",
};

export function payoutStatusLabel(status: string): string {
  return PAYOUT_STATUS_LABELS[status] ?? status;
}

async function merchantOwnerEmail(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { owner: { select: { email: true } } },
  });
  return tenant?.owner.email ?? null;
}

export async function notifyMerchantPayoutRequested(opts: {
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  payoutId: string;
}) {
  const to = await merchantOwnerEmail(opts.tenantId);
  if (!to) return;
  const amountFmt = formatMoney(opts.amount, opts.currency);
  await sendEmail({
    to,
    subject: `Payout requested — ${amountFmt}`,
    html: `
      <h2>Payout request received</h2>
      <p>We received your payout request for <strong>${amountFmt}</strong> from <strong>${opts.tenantName}</strong>.</p>
      <p>Status: <strong>Requested</strong> — our team will process it per schedule (${getMorPayoutScheduleLabel()}).</p>
      <p>You will receive another email when the payout is marked as paid.</p>
    `,
    text: `Payout requested: ${amountFmt}. Status: Requested.`,
  }).catch((e) => console.error("[payout-email] request", e));
}

export async function notifyMerchantPayoutStatus(opts: {
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: string;
  note?: string | null;
}) {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: opts.tenantId },
    select: { notifyPayoutFailed: true },
  });
  if (opts.status === "FAILED" && settings?.notifyPayoutFailed === false) {
    return;
  }

  const to = await merchantOwnerEmail(opts.tenantId);
  if (!to) return;
  const label = payoutStatusLabel(opts.status);
  const amountFmt = formatMoney(opts.amount, opts.currency);
  const subject =
    opts.status === "PAID"
      ? `Payout sent — ${amountFmt}`
      : opts.status === "PROCESSING"
        ? `Payout in processing — ${amountFmt}`
        : opts.status === "FAILED"
          ? `Payout failed — ${amountFmt}`
          : `Payout update — ${label}`;

  await sendEmail({
    to,
    subject,
    html: `
      <h2>Payout update</h2>
      <p>Your payout of <strong>${amountFmt}</strong> for <strong>${opts.tenantName}</strong> is now:</p>
      <p><strong>${label}</strong></p>
      ${opts.note ? `<p class="note">${opts.note}</p>` : ""}
      ${opts.status === "PAID" ? "<p>Funds should appear in your bank per your merchant agreement.</p>" : ""}
      ${
        opts.status === "FAILED"
          ? "<p>The balance was returned to your available earnings. Update your tax/payout details in Settings → Payments and request again, or contact support.</p>"
          : ""
      }
    `,
    text: `Payout ${amountFmt}: ${label}${opts.note ? ` — ${opts.note}` : ""}`,
  }).catch((e) => console.error("[payout-email] status", e));
}

export async function notifyPlatformPayoutRequested(opts: {
  tenantName: string;
  tenantSlug: string;
  amount: number;
  currency: string;
  payoutId: string;
}) {
  const to = process.env.PLATFORM_OPS_EMAIL?.trim();
  if (!to) return;
  const amountFmt = formatMoney(opts.amount, opts.currency);
  const adminUrl = process.env.PLATFORM_ADMIN_URL ?? "http://localhost:3003";
  await sendEmail({
    to,
    subject: `[MoR] Payout request — ${opts.tenantSlug} ${amountFmt}`,
    html: `
      <p>Merchant <strong>${opts.tenantName}</strong> (${opts.tenantSlug}) requested a payout of <strong>${amountFmt}</strong>.</p>
      <p><a href="${adminUrl}/tenants">Review in platform admin →</a></p>
    `,
  }).catch((e) => console.error("[payout-email] platform ops", e));
}
