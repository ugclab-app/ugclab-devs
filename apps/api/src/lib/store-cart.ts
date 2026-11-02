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
  /** Buyer opted into a digital subscription for this line. */
  subscribe?: boolean;
  /** Set when this line is part of a quantity offer. Catalog price is ignored. */
  unitAmountCents?: number;
};

export function chargedUnit(item: { unitAmountCents?: number }, catalogUnit: number) {
  return item.unitAmountCents != null && item.unitAmountCents > 0
    ? item.unitAmountCents
    : catalogUnit;
}

export function cartKey(item: CartItem) {
  return `${item.productId}:${item.variantId ?? ""}:${item.subscribe ? "sub" : ""}:${item.unitAmountCents ?? ""}`;
}

const pendingCart = new WeakMap<Context, CartItem[]>();

export function getCart(c: Context): CartItem[] {
  const pending = pendingCart.get(c);
  if (pending) return pending;
  const raw = getCookie(c, CART_COOKIE);
  if (!raw) {
    const empty: CartItem[] = [];
    pendingCart.set(c, empty);
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    const cart = parsed.map((i) => ({
      productId: i.productId,
      tenantId: i.tenantId,
      quantity: Math.max(1, i.quantity || 1),
      variantId: i.variantId || undefined,
      subscribe: i.subscribe === true,
      unitAmountCents:
        typeof i.unitAmountCents === "number" && i.unitAmountCents > 0
          ? Math.round(i.unitAmountCents)
          : undefined,
    }));
    pendingCart.set(c, cart);
    return cart;
  } catch {
    const empty: CartItem[] = [];
    pendingCart.set(c, empty);
    return empty;
  }
}

export function setCart(c: Context, cart: CartItem[]) {
  pendingCart.set(c, cart);
  setCookie(c, CART_COOKIE, JSON.stringify(cart), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function resolveTenantBySlug(slug: string) {
  const key = slug.toLowerCase();
  const direct = await prisma.tenant.findUnique({
    where: { slug: key },
    include: { settings: true },
  });
  const tenant =
    direct ??
    (await prisma.tenant.findFirst({
      where: { settings: { storeAliases: { has: key } } },
      include: { settings: true },
    }));
  if (!tenant || tenant.status !== "ACTIVE") return null;
  return tenant;
}
