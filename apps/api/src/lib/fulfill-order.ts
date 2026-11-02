import {
  OrderStatus,
  prisma,
  ProductType,
} from "@ugclab/database";
import { newDownloadToken } from "./checkout.js";
import { sendCustomerOrderReceipt } from "./order-emails.js";
import { notifyMerchantNewOrder } from "./notifications.js";
import { triggerPostPurchaseEmail } from "./email-automations.js";
import { dispatchMerchantWebhooks } from "./merchant-webhooks.js";
import { fulfillInventoryForOrder } from "./inventory.js";
import { createAffiliateCommissionForPaidOrder } from "./affiliate.js";
import { recordPlatformReferralForPaidOrder } from "./platform-partner.js";

/** Mark order paid, decrement stock, create digital downloads, send emails. */
export async function fulfillPaidOrder(
  orderId: string,
  opts: { stripePaymentId?: string; platformFeeAmount?: number } = {}
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
    },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
    return order;
  }
  if (order.status !== OrderStatus.PENDING) {
    throw new Error(`Cannot fulfill order in status ${order.status}`);
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: order.tenantId },
  });

  const platformFeeAmount =
    opts.platformFeeAmount != null ? opts.platformFeeAmount : order.platformFeeAmount;
  const soldOutTitles: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        ...(opts.stripePaymentId ? { stripePaymentId: opts.stripePaymentId } : {}),
        ...(opts.platformFeeAmount != null
          ? { platformFeeAmount: opts.platformFeeAmount }
          : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "STATUS_CHANGE",
        body: opts.stripePaymentId
          ? "Payment received via Stripe"
          : "Order marked as paid",
      },
    });

    try {
      const { assignInvoiceNumber } = await import("./invoice-numbering.js");
      await assignInvoiceNumber(tx, order);
    } catch (e) {
      console.error("[invoice] numbering", e);
    }

    if (order.discountCodeId) {
      await tx.discountCode.update({
        where: { id: order.discountCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (order.giftCardId && order.giftCardAmount > 0) {
      await tx.giftCard.update({
        where: { id: order.giftCardId },
        data: { balanceCents: { decrement: order.giftCardAmount } },
      });
    }

    if (order.customerId && order.loyaltyPointsSpent > 0) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { decrement: order.loyaltyPointsSpent } },
      });
    }

    if (order.customerId && order.storeCreditAmount > 0) {
      // Store credit is kept in the store base currency; the order may be in a market currency.
      const base = settings?.currency ?? order.currency;
      let debit = order.storeCreditAmount;
      if (base !== order.currency) {
        const { convertAmount } = await import("@ugclab/i18n/store-currency");
        const { ensureFxRates } = await import("./fx-rates.js");
        await ensureFxRates().catch(() => {});
        debit = convertAmount(order.storeCreditAmount, order.currency, base);
      }
      const cust = await tx.customer.findUnique({
        where: { id: order.customerId },
        select: { storeCreditCents: true },
      });
      await tx.customer.update({
        where: { id: order.customerId },
        data: { storeCreditCents: Math.max(0, (cust?.storeCreditCents ?? 0) - debit) },
      });
    }

    for (const line of order.items) {
      const product = line.product;
      if (!product) continue;
      if (product.type === ProductType.PHYSICAL) {
        if (line.variantId) {
          await tx.productVariant.updateMany({
            where: { id: line.variantId, inventory: { not: null } },
            data: { inventory: { decrement: line.quantity } },
          });
        }
        await tx.product.updateMany({
          where: { id: line.productId!, inventory: { not: null } },
          data: { inventory: { decrement: line.quantity } },
        });
        if (
          product.inventory != null &&
          product.inventory > 0 &&
          product.inventory - line.quantity <= 0
        ) {
          soldOutTitles.push(product.title);
        }
      } else if (product.type === ProductType.DIGITAL && line.productId) {
        const days = settings?.digitalLinkDays ?? 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        const asset = await tx.digitalAsset.findUnique({
          where: { productId: line.productId },
          select: { id: true, licenseKeysPool: true },
        });
        const { takeLicenseKey } = await import("./license-keys.js");
        let licenseKey: string | null = null;
        if (asset) {
          const taken = takeLicenseKey(asset.licenseKeysPool);
          licenseKey = taken.key;
          if (taken.key != null) {
            await tx.digitalAsset.update({
              where: { id: asset.id },
              data: { licenseKeysPool: taken.remaining },
            });
          }
        }
        // One key per unit purchased
        for (let q = 0; q < line.quantity; q++) {
          let keyForUnit = licenseKey;
          if (q > 0 && asset) {
            const refreshed = await tx.digitalAsset.findUnique({
              where: { id: asset.id },
              select: { licenseKeysPool: true },
            });
            const again = takeLicenseKey(refreshed?.licenseKeysPool);
            keyForUnit = again.key;
            if (again.key != null) {
              await tx.digitalAsset.update({
                where: { id: asset.id },
                data: { licenseKeysPool: again.remaining },
              });
            }
          }
          await tx.digitalDownload.create({
            data: {
              tenantId: order.tenantId,
              orderId: order.id,
              productId: line.productId,
              token: newDownloadToken(),
              expiresAt,
              licenseKey: keyForUnit,
            },
          });
        }
        if (order.customerId) {
          const { randomBytes } = await import("crypto");
          await tx.digitalEntitlement.create({
            data: {
              tenantId: order.tenantId,
              customerId: order.customerId,
              productId: line.productId,
              orderId: order.id,
              active: true,
              accessToken: randomBytes(24).toString("hex"),
              expiresAt,
            },
          });
        }
      }

      if (product.sellAsGiftCard && order.customerId) {
        const { generateGiftCardCode } = await import("./gift-card.js");
        await tx.giftCard.create({
          data: {
            tenantId: order.tenantId,
            code: generateGiftCardCode(),
            initialBalance: line.totalAmount,
            balanceCents: line.totalAmount,
            currency: order.currency,
            recipientEmail: order.guestEmail,
            note: `Purchased on order #${order.orderNumber}`,
            purchasedOrderId: order.id,
          },
        });
      }
    }
  });

  if (soldOutTitles.length) {
    const { notifyProductSoldOut } = await import("./owner-alerts.js");
    for (const title of soldOutTitles) {
      notifyProductSoldOut(order.tenantId, title).catch((err) =>
        console.error("[email] sold out", err)
      );
    }
  }

  try {
    await createAffiliateCommissionForPaidOrder(orderId, platformFeeAmount);
  } catch (e) {
    console.error("[affiliate] commission create", e);
  }

  try {
    await recordPlatformReferralForPaidOrder(orderId);
  } catch (e) {
    console.error("[platform-partner] referral", e);
  }

  try {
    await fulfillInventoryForOrder(orderId);
    const { applyLoyaltyEarn } = await import("./loyalty.js");
    await applyLoyaltyEarn(orderId).catch((e) => console.error("[loyalty] earn", e));
    await sendCustomerOrderReceipt(orderId);
    await notifyMerchantNewOrder(orderId);
    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (full?.customer?.email && !full.customer.marketingOptOut) {
      triggerPostPurchaseEmail(
        full.tenantId,
        full.customer.email,
        full.customer.name
      ).catch(console.error);
    }
  } catch {
    /* optional */
  }

  dispatchMerchantWebhooks(order.tenantId, "order.paid", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    currency: order.currency,
  }).catch(console.error);

  import("./suppliers.js")
    .then(({ pushSupplierOrders }) => pushSupplierOrders(orderId))
    .catch((e) => console.error("[suppliers]", e));

  import("./meta-capi.js")
    .then(({ sendPurchaseConversionEvents }) =>
      sendPurchaseConversionEvents(orderId)
    )
    .catch((e) => console.warn("[capi]", e));

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });
}
