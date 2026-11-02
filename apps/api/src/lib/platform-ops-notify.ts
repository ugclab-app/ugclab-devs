import { sendEmail } from "./email.js";

const OPS_EMAIL = () => process.env.PLATFORM_OPS_EMAIL?.trim() || null;

async function sendOpsTelegram(text: string) {
  const token = process.env.PLATFORM_OPS_TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.PLATFORM_OPS_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3500) }),
  });
  if (!res.ok) console.error("[ops-telegram]", await res.text());
}

export async function notifyPlatformOps(opts: {
  subject: string;
  html: string;
  text?: string;
  dedupeKey?: string;
}): Promise<boolean> {
  const text = opts.text ?? opts.subject;
  const to = OPS_EMAIL();
  const { prisma } = await import("@ugclab/database");
  if (opts.dedupeKey) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const prior = await prisma.platformEmailLog.findFirst({
      where: { template: `ops:${opts.dedupeKey}`, createdAt: { gte: since }, status: "sent" },
      select: { id: true },
    });
    if (prior) return false;
  }
  await sendOpsTelegram(`${opts.subject}\n${text}`).catch((e) => console.error("[ops-telegram]", e));
  if (!to) {
    if (opts.dedupeKey) {
      await prisma.platformEmailLog.create({
        data: { to: "telegram", subject: opts.subject.slice(0, 200), template: `ops:${opts.dedupeKey}`, status: "sent" },
      }).catch(() => {});
    }
    return false;
  }
  try {
    await sendEmail({
      to,
      subject: opts.subject,
      html: opts.html,
      text,
      template: opts.dedupeKey ? `ops:${opts.dedupeKey}` : "ops-alert",
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
