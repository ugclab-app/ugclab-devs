import { prisma } from "@ugclab/database";

/** Everything we hold about one shopper, for a GDPR/CCPA access request. */
export async function exportCustomerData(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    include: {
      addresses: true,
      wishlistItems: { include: { product: { select: { title: true, slug: true } } } },
      productSubscriptions: {
        select: {
          id: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          createdAt: true,
          product: { select: { title: true } },
        },
      },
      returnRequests: {
        select: { id: true, rmaCode: true, status: true, reason: true, createdAt: true },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { select: { title: true, quantity: true, unitAmount: true, totalAmount: true } },
        },
      },
    },
  });
  if (!customer) return null;

  const [reviews, questions, subscriber, carts, entitlements] = await Promise.all([
    prisma.productReview.findMany({
      where: { tenantId, authorEmail: customer.email },
      select: { id: true, rating: true, body: true, createdAt: true, product: { select: { title: true } } },
    }),
    prisma.productQuestion.findMany({
      where: { tenantId, authorEmail: customer.email },
      select: { id: true, question: true, answer: true, createdAt: true },
    }),
    prisma.emailSubscriber.findUnique({
      where: { tenantId_email: { tenantId, email: customer.email } },
      select: { source: true, marketingOptOut: true, confirmedAt: true, createdAt: true },
    }),
    prisma.abandonedCart.findMany({
      where: { tenantId, email: customer.email },
      select: { id: true, items: true, subtotalAmount: true, currency: true, updatedAt: true },
    }),
    prisma.digitalEntitlement.findMany({
      where: { tenantId, customerId },
      select: { id: true, productId: true, active: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const { passwordHash: _ph, passwordResetToken: _rt, ...profile } = customer;
  void _ph;
  void _rt;
  return {
    exportedAt: new Date().toISOString(),
    profile: {
      ...profile,
      orders: undefined,
      addresses: undefined,
      wishlistItems: undefined,
      productSubscriptions: undefined,
      returnRequests: undefined,
    },
    addresses: customer.addresses,
    orders: customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber,
      status: o.status,
      currency: o.currency,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      shipping: {
        name: o.shippingName,
        address1: o.shippingAddress1,
        address2: o.shippingAddress2,
        city: o.shippingCity,
        region: o.shippingRegion,
        postal: o.shippingPostal,
        country: o.shippingCountry,
        phone: o.shippingPhone,
      },
      customFields: o.customFields,
      items: o.items,
    })),
    wishlist: customer.wishlistItems.map((w) => ({ product: w.product, addedAt: w.createdAt })),
    subscriptions: customer.productSubscriptions,
    returns: customer.returnRequests,
    reviews,
    questions,
    marketing: subscriber,
    abandonedCarts: carts,
    digitalEntitlements: entitlements,
  };
}

/**
 * Erase personal data while keeping orders for accounting. Returns the placeholder email.
 * Irreversible: the customer can no longer sign in and all contact fields are blanked.
 */
export async function anonymizeCustomer(
  tenantId: string,
  customerId: string,
  actorEmail?: string | null
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, email: true, anonymizedAt: true, stripeCustomerId: true },
  });
  if (!customer) return null;
  if (customer.anonymizedAt) return { email: customer.email, alreadyDone: true };

  const originalEmail = customer.email;
  const placeholder = `deleted-${customer.id.slice(-8)}@anonymized.invalid`;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        email: placeholder,
        name: null,
        country: null,
        passwordHash: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        stripeCustomerId: null,
        marketingOptOut: true,
        loyaltyPoints: 0,
        storeCreditCents: 0,
        anonymizedAt: now,
      },
    });
    await tx.customerAddress.deleteMany({ where: { customerId: customer.id } });
    await tx.wishlistItem.deleteMany({ where: { customerId: customer.id } });
    await tx.emailSubscriber.deleteMany({ where: { tenantId, email: originalEmail } });
    await tx.abandonedCart.deleteMany({ where: { tenantId, email: originalEmail } });
    await tx.stockAlert.deleteMany({ where: { tenantId, email: originalEmail } });
    await tx.productReview.updateMany({
      where: { tenantId, authorEmail: originalEmail },
      data: { authorName: "Anonymous", authorEmail: null },
    });
    await tx.productQuestion.updateMany({
      where: { tenantId, authorEmail: originalEmail },
      data: { authorName: "Anonymous", authorEmail: null },
    });
    // Custom checkout answers are free text and may contain personal data; clear via SQL
    // (Prisma needs DbNull for JSON) before guestEmail is blanked below.
    await tx.$executeRaw`UPDATE "Order" SET "customFields" = NULL WHERE "tenantId" = ${tenantId} AND ("customerId" = ${customer.id} OR "guestEmail" = ${originalEmail})`;
    await tx.order.updateMany({
      where: { tenantId, OR: [{ customerId: customer.id }, { guestEmail: originalEmail }] },
      data: {
        guestEmail: null,
        shippingName: null,
        shippingAddress1: null,
        shippingAddress2: null,
        shippingPhone: null,
      },
    });
    await tx.digitalEntitlement.updateMany({
      where: { tenantId, customerId: customer.id },
      data: { active: false },
    });
    const orders = await tx.order.findMany({
      where: { tenantId, customerId: customer.id },
      select: { id: true },
    });
    if (orders.length) {
      await tx.orderEvent.createMany({
        data: orders.map((o) => ({
          tenantId,
          orderId: o.id,
          type: "NOTE",
          body: "Customer personal data erased (GDPR request)",
          authorEmail: actorEmail ?? null,
        })),
      });
    }
  });

  // Stripe customer stays in Stripe (merchant's own account / platform) — flag for the operator.
  return { email: placeholder, alreadyDone: false, hadStripeCustomer: Boolean(customer.stripeCustomerId) };
}
