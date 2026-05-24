import { createHmac } from "crypto";
import { prisma } from "@ugclab/database";

export type MerchantWebhookEvent =
  | "order.paid"
  | "product.updated"
  | "order.created";

export async function dispatchMerchantWebhooks(
  tenantId: string,
  event: MerchantWebhookEvent,
  payload: Record<string, unknown>
) {
  const hooks = await prisma.merchantWebhook.findMany({
    where: { tenantId, active: true, events: { has: event } },
  });
  if (!hooks.length) return;

  const body = JSON.stringify({
    event,
    createdAt: new Date().toISOString(),
    data: payload,
  });

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const sig = createHmac("sha256", hook.secret).update(body).digest("hex");
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-UGCLab-Event": event,
          "X-UGCLab-Signature": `sha256=${sig}`,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(
          `[merchant-webhook] ${hook.id} ${event} → ${res.status}`
        );
      }
    })
  );
}
