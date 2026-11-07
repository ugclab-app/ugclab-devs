import { createHmac } from "crypto";
import { lookup } from "dns/promises";
import { prisma } from "@ugclab/database";
import {
  checkWebhookUrl,
  isPrivateAddress,
  MAX_ATTEMPTS,
  nextRetryAt,
} from "./webhook-url-guard.js";

export type MerchantWebhookEvent =
  | "order.paid"
  | "order.created"
  | "order.fulfilled"
  | "product.updated"
  | "product.created"
  | "customer.created"
  | "subscription.updated";

/** Events Zapier / Make can subscribe to via Growth → Webhooks. */
export const MERCHANT_WEBHOOK_EVENTS: MerchantWebhookEvent[] = [
  "order.paid",
  "order.created",
  "order.fulfilled",
  "product.updated",
  "product.created",
  "customer.created",
  "subscription.updated",
];

/**
 * Queue one delivery per matching endpoint and try to send immediately.
 * Failures are left in the log and retried by cron with backoff.
 */
export async function dispatchMerchantWebhooks(
  tenantId: string,
  event: MerchantWebhookEvent,
  payload: Record<string, unknown>
) {
  const hooks = await prisma.merchantWebhook.findMany({
    where: { tenantId, active: true, events: { has: event } },
    select: { id: true },
  });
  if (!hooks.length) return;

  const rows = await Promise.all(
    hooks.map((hook) =>
      prisma.merchantWebhookDelivery.create({
        data: {
          tenantId,
          webhookId: hook.id,
          event,
          payload: payload as object,
          status: "PENDING",
          nextAttemptAt: new Date(),
        },
        select: { id: true },
      })
    )
  );
  await Promise.allSettled(rows.map((r) => attemptDelivery(r.id)));
}

/** Resolve the hostname and reject if any answer is a private/loopback address (DNS-rebinding guard). */
async function assertPublicHost(hostname: string) {
  if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) {
    if (isPrivateAddress(hostname)) throw new Error("Private IP addresses are not allowed");
    return;
  }
  const answers = await lookup(hostname, { all: true, verbatim: true });
  if (!answers.length) throw new Error("Hostname did not resolve");
  for (const a of answers) {
    if (isPrivateAddress(a.address)) {
      throw new Error(`Hostname resolves to a private address (${a.address})`);
    }
  }
}

export async function attemptDelivery(deliveryId: string) {
  const row = await prisma.merchantWebhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!row || row.status === "SUCCESS") return;
  if (!row.webhook.active) {
    await prisma.merchantWebhookDelivery.update({
      where: { id: row.id },
      data: { status: "FAILED", lastError: "Endpoint disabled", nextAttemptAt: null },
    });
    return;
  }

  const body = JSON.stringify({
    id: row.id,
    event: row.event,
    createdAt: row.createdAt.toISOString(),
    attempt: row.attempts + 1,
    data: row.payload,
  });
  const sig = createHmac("sha256", row.webhook.secret).update(body).digest("hex");

  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    const check = checkWebhookUrl(row.webhook.url);
    if (!check.ok) throw new Error(check.reason);
    await assertPublicHost(check.hostname);
    const res = await fetch(row.webhook.url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "UGCLab-Webhooks/1.0",
        "X-UGCLab-Event": row.event,
        "X-UGCLab-Delivery": row.id,
        "X-UGCLab-Signature": `sha256=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    statusCode = res.status;
    if (res.status >= 300 && res.status < 400) {
      error = "Redirects are not followed";
    } else if (!res.ok) {
      error = `HTTP ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const attempts = row.attempts + 1;
  if (!error) {
    await prisma.merchantWebhookDelivery.update({
      where: { id: row.id },
      data: {
        status: "SUCCESS",
        attempts,
        lastStatusCode: statusCode,
        lastError: null,
        nextAttemptAt: null,
        deliveredAt: new Date(),
      },
    });
    return;
  }

  const next = nextRetryAt(attempts);
  await prisma.merchantWebhookDelivery.update({
    where: { id: row.id },
    data: {
      status: next ? "PENDING" : "FAILED",
      attempts,
      lastStatusCode: statusCode,
      lastError: error.slice(0, 500),
      nextAttemptAt: next,
    },
  });
  if (!next) {
    console.warn(`[merchant-webhook] ${row.webhookId} ${row.event} gave up after ${MAX_ATTEMPTS} attempts: ${error}`);
  }
}

/** Cron: retry everything whose backoff window has elapsed. */
export async function processWebhookRetries(limit = 50) {
  const due = await prisma.merchantWebhookDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });
  for (const d of due) {
    await attemptDelivery(d.id).catch((e) =>
      console.error("[merchant-webhook] retry", d.id, e)
    );
  }
  return { retried: due.length };
}

/** Manual "redeliver" from the admin: reset and send now. */
export async function redeliverWebhook(tenantId: string, deliveryId: string) {
  const row = await prisma.merchantWebhookDelivery.findFirst({
    where: { id: deliveryId, tenantId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.merchantWebhookDelivery.update({
    where: { id: row.id },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null },
  });
  await attemptDelivery(row.id);
  return true;
}
