import { prisma } from "@ugclab/database";
import { parseIntegrations } from "./growth-settings.js";

type TwilioChannel = "sms" | "whatsapp";

function parseTwilio(integrations: ReturnType<typeof parseIntegrations> & Record<string, unknown>) {
  const raw = (integrations as Record<string, unknown>).twilio;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const accountSid = String(o.accountSid ?? "").trim();
  const authToken = String(o.authToken ?? "").trim();
  const fromSms = String(o.fromSms ?? "").trim();
  const fromWhatsapp = String(o.fromWhatsapp ?? "").trim();
  const notifyOrders = o.notifyOrders === true || o.notifyOrders === "true";
  const merchantPhone = String(o.merchantPhone ?? "").trim();
  if (!accountSid || !authToken) return null;
  return { accountSid, authToken, fromSms, fromWhatsapp, notifyOrders, merchantPhone };
}

async function sendTwilio(
  cfg: NonNullable<ReturnType<typeof parseTwilio>>,
  channel: TwilioChannel,
  to: string,
  body: string
) {
  const from =
    channel === "whatsapp"
      ? cfg.fromWhatsapp || cfg.fromSms
      : cfg.fromSms || cfg.fromWhatsapp;
  if (!from || !to) return false;
  const toAddr = channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;
  const fromAddr =
    channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  const form = new URLSearchParams({ To: toAddr, From: fromAddr, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[twilio]", channel, res.status, text.slice(0, 300));
    return false;
  }
  return true;
}

/** Notify merchant phone via SMS and/or WhatsApp when a new paid order arrives. */
export async function notifyMerchantSmsWhatsApp(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { settings: true } },
      customer: true,
    },
  });
  if (!order?.tenant.settings) return;
  const integrations = parseIntegrations(order.tenant.settings.integrations) as ReturnType<
    typeof parseIntegrations
  > &
    Record<string, unknown>;
  const twilio = parseTwilio(integrations);
  if (!twilio?.notifyOrders || !twilio.merchantPhone) return;

  const who = order.customer?.email || order.guestEmail || "Guest";
  const body = `${order.tenant.name}: new order #${order.orderNumber} — ${who} — ${(order.totalAmount / 100).toFixed(2)} ${order.currency}`;

  if (twilio.fromSms) {
    await sendTwilio(twilio, "sms", twilio.merchantPhone, body).catch((e) =>
      console.error("[sms]", e)
    );
  }
  if (twilio.fromWhatsapp) {
    await sendTwilio(twilio, "whatsapp", twilio.merchantPhone, body).catch((e) =>
      console.error("[whatsapp]", e)
    );
  }
}
