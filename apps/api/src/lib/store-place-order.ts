import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import { hash } from "bcryptjs";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  calcTax,
  newAccessToken,
  resolveShipping,
  validateDiscountCode,
} from "./checkout.js";
import { validateGiftCard } from "./gift-card.js";
import { parseStoreTheme } from "./store-theme.js";
import { applyAutoPromotions } from "./promotions.js";
import { fulfillPaidOrder } from "./fulfill-order.js";
import {
  calcPlatformFeeAmount,
  resolvePlatformFeeBps,
} from "./platform-fee.js";
import type Stripe from "stripe";
import { isMorPaymentModel } from "./payment-model.js";
import { getStripe, isStripeConfigured } from "./stripe.js";
import { getStorefrontUrl } from "./storefront.js";
import {
  cartKey,
  CUSTOMER_COOKIE,
  getCart,
  setCart,
  type CartItem,
} from "./store-cart.js";
import {
  getStoreSessionKey,
  markAbandonedCartConverted,
} from "./abandoned-cart.js";

export type PreparedOrder = {
  tenantId: string;
  tenantSlug: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  feeBps: number;
  email: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  platformFeeAmount: number;
  discountCodeId: string | null;
  giftCardId: string | null;
  giftCardAmount: number;
  country: string;
  hasPhysical: boolean;
  shippingName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingPostal: string | null;
  customerId: string;
  orderNumber: string;
  accessToken: string;
  stripeTaxEnabled: boolean;
  stripeLinkEnabled: boolean;
  stripePaypalEnabled: boolean;
  shippingLabel: string | null;
  lineData: {
    productId: string;
    variantId: string | null;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    type: ProductType;
  }[];
};

async function prepareOrder(
  c: Context,
  tenantId: string,
  body: Record<string, unknown>
): Promise<PreparedOrder> {
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(body.name ?? "").trim();
  const country = String(body.country ?? "US")
    .toUpperCase()
    .slice(0, 2);
  const discountCode = String(body.discountCode ?? "").trim();
  const createAccount = Boolean(body.createAccount);
  const password = String(body.password ?? "");
  const acceptPolicies = Boolean(body.acceptPolicies);
  const shippingName = String(body.shippingName ?? name).trim();
  const shippingAddress1 = String(body.shippingAddress1 ?? "").trim();
  const shippingAddress2 = String(body.shippingAddress2 ?? "").trim();
  const shippingCity = String(body.shippingCity ?? "").trim();
  const shippingPostal = String(body.shippingPostal ?? "").trim();

  if (!email) throw new Error("Email is required");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true, subscriptionPlan: true },
  });
  if (!tenant) throw new Error("Store not found");

  const bundleId = String(body.bundleId ?? "").trim();
  let cart = getCart(c).filter((i) => i.tenantId === tenantId);
  let lineData: PreparedOrder["lineData"] = [];
  let subtotal = 0;
  let totalWeightGrams = 0;
  let hasPhysical = false;

  if (bundleId) {
    const bundle = await prisma.productBundle.findFirst({
      where: { id: bundleId, tenantId, active: true },
      include: {
        items: {
          include: {
            product: { include: { variants: true, digitalAsset: true } },
          },
        },
      },
    });
    if (!bundle?.items.length) throw new Error("Bundle not found");
    const catalogSum = bundle.items.reduce(
      (s, i) => s + i.product.priceAmount * i.quantity,
      0
    );
    for (const item of bundle.items) {
      const p = item.product;
      if (p.status !== ProductStatus.ACTIVE) {
        throw new Error(`${p.title} is unavailable`);
      }
      const share =
        catalogSum > 0
          ? Math.round(
              (bundle.priceAmount * (p.priceAmount * item.quantity)) / catalogSum
            )
          : Math.round(bundle.priceAmount / bundle.items.length);
      const unit = Math.round(share / item.quantity);
      const lineTotal = unit * item.quantity;
      subtotal += lineTotal;
      if (p.type === ProductType.PHYSICAL) {
        hasPhysical = true;
        totalWeightGrams += (p.weightGrams ?? 0) * item.quantity;
      }
      lineData.push({
        productId: p.id,
        variantId: null,
        title: `${bundle.title} — ${p.title}`,
        quantity: item.quantity,
        unitAmount: unit,
        totalAmount: lineTotal,
        type: p.type,
      });
    }
    subtotal = bundle.priceAmount;
    lineData = lineData.map((l, idx, arr) => {
      if (idx < arr.length - 1) return l;
      const fixed = bundle.priceAmount - arr.slice(0, -1).reduce((s, x) => s + x.totalAmount, 0);
      return {
        ...l,
        totalAmount: fixed,
        unitAmount: Math.round(fixed / l.quantity),
      };
    });
  } else {
    if (cart.length === 0) throw new Error("Cart is empty");

    const products = await prisma.product.findMany({
      where: {
        id: { in: cart.map((i) => i.productId) },
        tenantId,
        status: ProductStatus.ACTIVE,
      },
      include: { digitalAsset: true, variants: true },
    });

    for (const item of cart) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) continue;
      const variant = item.variantId
        ? p.variants.find((v) => v.id === item.variantId)
        : null;
      const unit = variant?.priceAmount ?? p.priceAmount;
      const title = variant ? `${p.title} — ${variant.title}` : p.title;
      const stock = variant?.inventory ?? p.inventory;
      if (p.type === ProductType.PHYSICAL && stock != null && stock < item.quantity) {
        throw new Error(`${title} is out of stock`);
      }
      const lineTotal = unit * item.quantity;
      subtotal += lineTotal;
      if (p.type === ProductType.PHYSICAL) {
        hasPhysical = true;
        totalWeightGrams +=
          (variant?.weightGrams ?? p.weightGrams ?? 0) * item.quantity;
      }
      lineData.push({
        productId: p.id,
        variantId: variant?.id ?? null,
        title,
        quantity: item.quantity,
        unitAmount: unit,
        totalAmount: lineTotal,
        type: p.type,
      });
    }
  }

  if (lineData.length === 0) throw new Error("No valid products in cart");

  const settings = tenant.settings;
  const currency = settings?.currency ?? "USD";
  const hasPolicies =
    settings?.privacyUrl ||
    settings?.refundUrl ||
    settings?.privacyPolicy ||
    settings?.refundPolicy;
  if (hasPolicies && !acceptPolicies) {
    throw new Error("Please accept store policies");
  }

  const auto = await applyAutoPromotions(tenantId, subtotal);
  let discountAmount = auto.discountAmount;
  let discountCodeId: string | null = null;
  if (discountCode) {
    const d = await validateDiscountCode(
      tenantId,
      discountCode,
      subtotal - discountAmount
    );
    if (d) {
      discountAmount += d.discountAmount;
      discountCodeId = d.discount.id;
    }
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const afterDiscount = subtotal - discountAmount;
  const theme = parseStoreTheme(settings?.theme);
  const shippingQuote = hasPhysical
    ? await resolveShipping(tenantId, country, afterDiscount, totalWeightGrams)
    : { amount: 0, label: null };
  let shippingAmount = shippingQuote.amount;
  if (auto.freeShipping && hasPhysical) shippingAmount = 0;
  const customShipping = parseInt(String(body.shippingAmountCents ?? ""), 10);
  if (Number.isFinite(customShipping) && customShipping >= 0 && hasPhysical) {
    shippingAmount = customShipping;
  }

  const shippingLabel =
    theme.shippingCarrierLabel?.trim() ||
    shippingQuote.label ||
    (hasPhysical ? "Standard shipping" : null);

  const stripeTaxEnabled = theme.stripeTaxEnabled === true;
  const stripeLinkEnabled = theme.stripeLinkEnabled !== false;
  const stripePaypalEnabled = theme.stripePaypalEnabled === true;
  const taxAmount = stripeTaxEnabled
    ? 0
    : calcTax(
        afterDiscount + shippingAmount,
        settings?.taxRateBps ?? 0,
        settings?.taxIncluded ?? false
      );
  let totalAmount = afterDiscount + shippingAmount + taxAmount;

  let giftCardId: string | null = null;
  let giftCardAmount = 0;
  const giftCardCode = String(body.giftCardCode ?? "").trim();
  if (giftCardCode) {
    const gc = await validateGiftCard(tenantId, giftCardCode, totalAmount);
    if (gc) {
      giftCardAmount = gc.giftCardAmount;
      giftCardId = gc.card.id;
      totalAmount -= giftCardAmount;
    }
  }

  const feeBps = resolvePlatformFeeBps(tenant);
  const platformFeeAmount = calcPlatformFeeAmount(totalAmount, feeBps);

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { tenantId, email, name: name || null, country },
    });
    const { triggerWelcomeEmail } = await import("./email-automations.js");
    triggerWelcomeEmail(tenantId, email, name || null).catch(console.error);
  } else if (name) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name, country },
    });
  }

  if (createAccount && password.length >= 8) {
    const passwordHash = await hash(password, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });
    setCookie(
      c,
      CUSTOMER_COOKIE,
      JSON.stringify({ tenantId, customerId: customer.id }),
      {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      }
    );
  }

  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = String(
    (lastOrder ? parseInt(lastOrder.orderNumber, 10) : 1000) + 1
  );

  return {
    tenantId,
    tenantSlug: tenant.slug,
    stripeAccountId: tenant.stripeAccountId,
    stripeChargesEnabled: tenant.stripeChargesEnabled,
    feeBps,
    email,
    currency,
    subtotal,
    shippingAmount,
    taxAmount,
    discountAmount,
    totalAmount,
    platformFeeAmount,
    discountCodeId,
    giftCardId,
    giftCardAmount,
    country,
    hasPhysical,
    shippingName: hasPhysical ? shippingName || name : null,
    shippingAddress1: hasPhysical ? shippingAddress1 || null : null,
    shippingAddress2: hasPhysical ? shippingAddress2 || null : null,
    shippingCity: hasPhysical ? shippingCity || null : null,
    shippingPostal: hasPhysical ? shippingPostal || null : null,
    customerId: customer.id,
    orderNumber,
    accessToken: newAccessToken(),
    stripeTaxEnabled,
    stripeLinkEnabled,
    stripePaypalEnabled,
    shippingLabel,
    lineData,
  };
}

async function createPendingOrder(prepared: PreparedOrder) {
  const order = await prisma.order.create({
    data: {
      tenantId: prepared.tenantId,
      customerId: prepared.customerId,
      orderNumber: prepared.orderNumber,
      status: OrderStatus.PENDING,
      currency: prepared.currency,
      subtotalAmount: prepared.subtotal,
      shippingAmount: prepared.shippingAmount,
      taxAmount: prepared.taxAmount,
      discountAmount: prepared.discountAmount,
      totalAmount: prepared.totalAmount,
      platformFeeAmount: prepared.platformFeeAmount,
      shippingCountry: prepared.country,
      shippingName: prepared.shippingName,
      shippingAddress1: prepared.shippingAddress1,
      shippingAddress2: prepared.shippingAddress2,
      shippingCity: prepared.shippingCity,
      shippingPostal: prepared.shippingPostal,
      discountCodeId: prepared.discountCodeId,
      giftCardId: prepared.giftCardId,
      giftCardAmount: prepared.giftCardAmount,
      accessToken: prepared.accessToken,
      guestEmail: prepared.email,
      items: {
        create: prepared.lineData.map((l) => ({
          tenantId: prepared.tenantId,
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          totalAmount: l.totalAmount,
        })),
      },
      events: {
        create: {
          tenantId: prepared.tenantId,
          type: "STATUS_CHANGE",
          body: "Order created — awaiting payment",
        },
      },
    },
  });
  const { reserveInventoryForOrder } = await import("./inventory.js");
  await reserveInventoryForOrder(order.id).catch(() => {});
  return order;
}

async function createStripeCheckout(
  prepared: PreparedOrder,
  orderId: string,
  locale: string
) {
  const mor = isMorPaymentModel();
  if (
    !mor &&
    (!prepared.stripeAccountId || !prepared.stripeChargesEnabled)
  ) {
    throw new Error("This store has not connected Stripe payments yet");
  }
  if (mor && !isStripeConfigured()) {
    throw new Error("Platform payments are not configured");
  }
  const stripe = getStripe();
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const successUrl = new URL(`${base}/orders/${orderId}`);
  successUrl.searchParams.set("tenant", prepared.tenantSlug);
  successUrl.searchParams.set("locale", locale);
  successUrl.searchParams.set("token", prepared.accessToken);
  successUrl.searchParams.set("paid", "1");

  const cancelUrl = new URL(`${base}/checkout`);
  cancelUrl.searchParams.set("tenant", prepared.tenantSlug);
  cancelUrl.searchParams.set("locale", locale);

  const applicationFee =
    !mor &&
    prepared.platformFeeAmount > 0 &&
    prepared.platformFeeAmount < prepared.totalAmount
      ? prepared.platformFeeAmount
      : undefined;

  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    ["card"];
  if (prepared.stripeLinkEnabled) paymentMethodTypes.push("link");
  if (prepared.stripePaypalEnabled) paymentMethodTypes.push("paypal");

  const sessionBase: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    customer_email: prepared.email,
    ...(prepared.stripeTaxEnabled
      ? {
          automatic_tax: { enabled: true },
          shipping_address_collection: {
            allowed_countries: [
              "US",
              "CA",
              "GB",
              "DE",
              "FR",
              "ES",
              "IT",
              "NL",
              "AU",
              "PL",
            ],
          },
        }
      : {}),
    line_items: [
      {
        price_data: {
          currency: prepared.currency.toLowerCase(),
          unit_amount: prepared.totalAmount,
          product_data: {
            name: `Order #${prepared.orderNumber}`,
            ...(mor ? { description: `Store: ${prepared.tenantSlug}` } : {}),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId,
      tenantId: prepared.tenantId,
      paymentModel: mor ? "mor" : "connect",
    },
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  };

  const session = mor
    ? await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: {
          metadata: {
            orderId,
            tenantId: prepared.tenantId,
            paymentModel: "mor",
          },
        },
      })
    : await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: { destination: prepared.stripeAccountId! },
          metadata: {
            orderId,
            tenantId: prepared.tenantId,
          },
        },
      });

  await prisma.order.update({
    where: { id: orderId },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function placeStoreOrder(
  c: Context,
  tenantId: string,
  body: Record<string, unknown>
) {
  const prepared = await prepareOrder(c, tenantId, body);
  const locale = String(body.locale ?? "en").slice(0, 5);

  const useStripe =
    isStripeConfigured() &&
    (isMorPaymentModel() ||
      Boolean(prepared.stripeAccountId && prepared.stripeChargesEnabled));

  if (useStripe) {
    const order = await createPendingOrder(prepared);
    const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
    setCart(c, remaining);
    await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(
      () => {}
    );
    const checkoutUrl = await createStripeCheckout(prepared, order.id, locale);
    return {
      mode: "stripe" as const,
      orderId: order.id,
      orderNumber: prepared.orderNumber,
      checkoutUrl,
    };
  }

  const order = await createPendingOrder(prepared);
  await fulfillPaidOrder(order.id, {
    platformFeeAmount: prepared.platformFeeAmount,
  });

  const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
  setCart(c, remaining);
  await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(() => {});

  return {
    mode: "demo" as const,
    orderId: order.id,
    accessToken: prepared.accessToken,
    orderNumber: prepared.orderNumber,
  };
}

export function updateCartItem(
  c: Context,
  tenantId: string,
  item: CartItem,
  quantity: number
) {
  const cart = getCart(c);
  const key = cartKey(item);
  const idx = cart.findIndex((i) => cartKey(i) === key);
  if (idx === -1) return getCart(c);
  if (quantity <= 0) cart.splice(idx, 1);
  else cart[idx]!.quantity = quantity;
  setCart(c, cart);
  return cart;
}

export function addCartItem(c: Context, item: CartItem) {
  const cart = getCart(c);
  const key = cartKey(item);
  const existing = cart.find((i) => cartKey(i) === key);
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  setCart(c, cart);
  return cart;
}

export function removeCartItem(
  c: Context,
  item: Pick<CartItem, "productId" | "variantId" | "tenantId">
) {
  const key = cartKey({ ...item, quantity: 1 });
  const cart = getCart(c).filter((i) => cartKey(i) !== key);
  setCart(c, cart);
  return cart;
}
