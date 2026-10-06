import { OrderStatus, prisma, ProductStatus } from "@ugclab/database";
import { newAccessToken } from "./checkout.js";
import {
  calcPlatformFeeAmount,
  resolvePlatformFeeBps,
} from "./platform-fee.js";
import { isMorPaymentModel } from "./payment-model.js";
import { getStripe, isStripeConfigured } from "./stripe.js";

export async function createMerchantDraftOrder(
  tenantId: string,
  body: {
    email: string;
    name?: string;
    lines: { productId: string; quantity?: number }[];
    note?: string;
  }
) {
  const email = body.email.trim().toLowerCase();
  if (!email) throw new Error("Customer email is required");
  if (!body.lines?.length) throw new Error("Add at least one line item");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true, subscriptionPlan: true },
  });
  if (!tenant) throw new Error("Store not found");

  const productIds = body.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      id: { in: productIds },
      status: { in: [ProductStatus.ACTIVE, ProductStatus.DRAFT] },
    },
  });
  if (products.length !== productIds.length) {
    throw new Error("One or more products not found");
  }

  let subtotal = 0;
  const lineData: {
    productId: string;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[] = [];

  for (const line of body.lines) {
    const p = products.find((x) => x.id === line.productId)!;
    const qty = Math.max(1, line.quantity ?? 1);
    const unit = p.priceAmount;
    const total = unit * qty;
    subtotal += total;
    lineData.push({
      productId: p.id,
      title: p.title,
      quantity: qty,
      unitAmount: unit,
      totalAmount: total,
    });
  }

  const currency = tenant.settings?.currency ?? "USD";
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const orderNumber = String(
    (lastOrder ? parseInt(lastOrder.orderNumber, 10) : 1000) + 1
  );

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { tenantId, email, name: body.name?.trim() || null },
    });
  }

  const accessToken = newAccessToken();
  const feeBps = resolvePlatformFeeBps(tenant);
  const platformFeeAmount = calcPlatformFeeAmount(subtotal, feeBps);

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber,
      status: OrderStatus.DRAFT,
      currency,
      subtotalAmount: subtotal,
      totalAmount: subtotal,
      platformFeeAmount,
      accessToken,
      guestEmail: email,
      shippingName: body.name?.trim() || null,
      items: {
        create: lineData.map((l) => ({
          tenantId,
          productId: l.productId,
          title: l.title,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          totalAmount: l.totalAmount,
        })),
      },
      events: body.note?.trim()
        ? {
            create: {
              tenantId,
              type: "NOTE",
              body: body.note.trim(),
            },
          }
        : undefined,
    },
    include: { customer: true, items: true },
  });

  return order;
}

/** Stripe Checkout URL for a draft/pending unpaid order (invoice link). */
export async function createDraftOrderPaymentLink(
  tenantId: string,
  orderId: string,
  locale = "en"
): Promise<{ checkoutUrl: string; orderUrl: string; accessToken: string }> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      items: true,
      customer: true,
      tenant: { include: { settings: true, subscriptionPlan: true } },
    },
  });
  if (!order) throw new Error("Order not found");
  if (
    order.status !== OrderStatus.DRAFT &&
    order.status !== OrderStatus.PENDING
  ) {
    throw new Error("Only draft or unpaid pending orders can get a payment link");
  }
  if (order.totalAmount <= 0) throw new Error("Order total must be greater than zero");
  if (!order.items.length) throw new Error("Order has no line items");

  const mor = isMorPaymentModel();
  if (mor && !isStripeConfigured()) {
    throw new Error("Platform payments are not configured");
  }
  if (
    !mor &&
    (!order.tenant.stripeAccountId || !order.tenant.stripeChargesEnabled)
  ) {
    throw new Error("This store has not connected Stripe payments yet");
  }

  const accessToken = order.accessToken ?? newAccessToken();
  const feeBps = resolvePlatformFeeBps(order.tenant);
  const platformFeeAmount =
    order.platformFeeAmount > 0
      ? order.platformFeeAmount
      : calcPlatformFeeAmount(order.totalAmount, feeBps);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PENDING,
      accessToken,
      platformFeeAmount,
    },
  });

  const stripe = getStripe();
  const storefrontBase = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const successUrl = new URL(`${storefrontBase}/orders/${order.id}`);
  successUrl.searchParams.set("tenant", order.tenant.slug);
  successUrl.searchParams.set("locale", locale);
  successUrl.searchParams.set("token", accessToken);
  successUrl.searchParams.set("paid", "1");

  const cancelUrl = new URL(`${storefrontBase}/orders/${order.id}`);
  cancelUrl.searchParams.set("tenant", order.tenant.slug);
  cancelUrl.searchParams.set("locale", locale);
  cancelUrl.searchParams.set("token", accessToken);

  const applicationFee =
    !mor &&
    platformFeeAmount > 0 &&
    platformFeeAmount < order.totalAmount
      ? platformFeeAmount
      : undefined;

  const email =
    order.guestEmail ?? order.customer?.email ?? undefined;

  const sessionBase = {
    mode: "payment" as const,
    payment_method_types: ["card" as const],
    customer_email: email,
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: item.unitAmount,
        product_data: {
          name: item.title,
          ...(mor ? { description: `Store: ${order.tenant.slug}` } : {}),
        },
      },
    })),
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
      paymentModel: mor ? "mor" : "connect",
      type: "draft_invoice",
    },
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  };

  const session = mor
    ? await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: {
          metadata: sessionBase.metadata,
        },
      })
    : await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: { destination: order.tenant.stripeAccountId! },
          metadata: sessionBase.metadata,
        },
      });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripeCheckoutSessionId: session.id,
      paymentProvider: "stripe",
    },
  });

  const orderUrl = new URL(`${storefrontBase}/orders/${order.id}`);
  orderUrl.searchParams.set("tenant", order.tenant.slug);
  orderUrl.searchParams.set("token", accessToken);

  return {
    checkoutUrl: session.url,
    orderUrl: orderUrl.toString(),
    accessToken,
  };
}
