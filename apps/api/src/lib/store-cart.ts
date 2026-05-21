import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { prisma } from "@ugclab/database";

export const CART_COOKIE = "ugclab_cart";
export const CUSTOMER_COOKIE = "ugclab_customer";

export type CartItem = {
  productId: string;
  tenantId: string;
  quantity: number;
  variantId?: string;
};

export function cartKey(item: CartItem) {
  return `${item.productId}:${item.variantId ?? ""}`;
}

export function getCart(c: Context): CartItem[] {
  const raw = getCookie(c, CART_COOKIE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return parsed.map((i) => ({
      productId: i.productId,
      tenantId: i.tenantId,
      quantity: Math.max(1, i.quantity || 1),
      variantId: i.variantId || undefined,
    }));
  } catch {
    return [];
  }
}

export function setCart(c: Context, cart: CartItem[]) {
  setCookie(c, CART_COOKIE, JSON.stringify(cart), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function resolveTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
    include: { settings: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") return null;
  return tenant;
}
