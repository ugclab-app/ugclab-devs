import { prisma } from "@ugclab/database";
import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { sendEmail } from "./email.js";
import { getStorefrontUrl } from "./storefront.js";
import type { CartItem } from "./store-cart.js";

export const STORE_SESSION_COOKIE = "ugclab_sid";

export function getStoreSessionKey(c: Context): string {
  let sid = getCookie(c, STORE_SESSION_COOKIE);
  if (!sid) {
    sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    setCookie(c, STORE_SESSION_COOKIE, sid, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}

export async function syncAbandonedCart(opts: {
  c: Context;
  tenantId: string;
  tenantSlug: string;
  currency: string;
  items: CartItem[];
  email?: string;
  subtotalAmount: number;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    include: { settings: true },
  });
  if (!tenant?.settings?.abandonedCartEnabled) return;
  if (opts.items.length === 0) return;

  const sessionKey = getStoreSessionKey(opts.c);
  const email = opts.email?.trim().toLowerCase() || undefined;

  await prisma.abandonedCart.upsert({
    where: {
      tenantId_sessionKey: { tenantId: opts.tenantId, sessionKey },
    },
    create: {
      tenantId: opts.tenantId,
      sessionKey,
      email,
      items: opts.items,
      subtotalAmount: opts.subtotalAmount,
      currency: opts.currency,
    },
    update: {
      ...(email ? { email } : {}),
      items: opts.items,
      subtotalAmount: opts.subtotalAmount,
    },
  });
}

export async function markAbandonedCartConverted(
  tenantId: string,
  sessionKey: string
) {
  await prisma.abandonedCart.updateMany({
    where: { tenantId, sessionKey, convertedAt: null },
    data: { convertedAt: new Date() },
  });
}

export async function processAbandonedCartReminders() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

  const carts = await prisma.abandonedCart.findMany({
    where: {
      convertedAt: null,
      email: { not: null },
      updatedAt: { lte: oneHourAgo },
    },
    include: { tenant: { select: { slug: true, name: true } } },
    take: 100,
  });

  for (const cart of carts) {
    if (!cart.email) continue;
    const storeUrl = getStorefrontUrl(cart.tenant.slug);
    const total = (cart.subtotalAmount / 100).toFixed(2);

    if (!cart.remindedAt1h && cart.updatedAt <= oneHourAgo) {
      await sendEmail({
        to: cart.email,
        subject: `You left items in your cart — ${cart.tenant.name}`,
        html: `
          <h2>Complete your order</h2>
          <p>You have items waiting at <strong>${cart.tenant.name}</strong>.</p>
          <p>Cart total: ${total} ${cart.currency}</p>
          <p><a href="${storeUrl}/cart">Return to cart →</a></p>
        `,
      });
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { remindedAt1h: new Date() },
      });
      continue;
    }

    if (
      cart.remindedAt1h &&
      !cart.remindedAt24h &&
      cart.updatedAt <= twentyFourHoursAgo
    ) {
      await sendEmail({
        to: cart.email,
        subject: `Still thinking? Your cart at ${cart.tenant.name}`,
        html: `
          <h2>Your cart is still here</h2>
          <p>Don't miss out — ${total} ${cart.currency} in your cart.</p>
          <p><a href="${storeUrl}/cart">Checkout now →</a></p>
        `,
      });
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { remindedAt24h: new Date() },
      });
    }
  }
}
