import { createHash } from "crypto";
import { prisma } from "@ugclab/database";
import { parseIntegrations } from "./growth-settings.js";

function sha256Email(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const n = email.trim().toLowerCase();
  if (!n.includes("@")) return undefined;
  return createHash("sha256").update(n).digest("hex");
}

/** Server-side Meta Conversions API Purchase (and optionally TikTok Events API). */
export async function sendPurchaseConversionEvents(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!order) return;

  const integrations = parseIntegrations(order.tenant.settings?.integrations);
  const email = order.guestEmail ?? order.customer?.email ?? null;
  const em = sha256Email(email);
  const value = order.totalAmount / 100;
  const contents = order.items
    .filter((i) => i.productId)
    .map((i) => ({
      id: i.productId!,
      quantity: i.quantity,
      item_price: i.unitAmount / 100,
    }));

  if (integrations.metaPixelId && integrations.metaCapiAccessToken) {
    try {
      const url = new URL(
        `https://graph.facebook.com/v21.0/${integrations.metaPixelId}/events`
      );
      url.searchParams.set("access_token", integrations.metaCapiAccessToken);
      const body = {
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: `order_${order.id}`,
            action_source: "website",
            user_data: {
              ...(em ? { em: [em] } : {}),
              client_user_agent: "tescommerce-capi/1.0",
            },
            custom_data: {
              currency: order.currency,
              value,
              content_type: "product",
              content_ids: contents.map((c) => c.id),
              contents,
              order_id: order.orderNumber,
            },
          },
        ],
      };
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.warn("[meta-capi]", await res.text());
      }
    } catch (e) {
      console.warn("[meta-capi]", e);
    }
  }

  if (integrations.tiktokPixelId && integrations.tiktokAccessToken) {
    try {
      const res = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/event/track/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": integrations.tiktokAccessToken,
          },
          body: JSON.stringify({
            event_source: "web",
            event_source_id: integrations.tiktokPixelId,
            data: [
              {
                event: "CompletePayment",
                event_time: Math.floor(Date.now() / 1000),
                event_id: `order_${order.id}`,
                user: em ? { email: em } : {},
                properties: {
                  currency: order.currency,
                  value,
                  contents: contents.map((c) => ({
                    content_id: c.id,
                    quantity: c.quantity,
                    price: c.item_price,
                  })),
                },
              },
            ],
          }),
        }
      );
      if (!res.ok) {
        console.warn("[tiktok-events]", await res.text());
      }
    } catch (e) {
      console.warn("[tiktok-events]", e);
    }
  }
}
