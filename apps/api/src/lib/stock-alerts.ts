import { prisma, ProductStatus, ProductType } from "@ugclab/database";
import { sendEmail } from "./email.js";

export async function processStockAlerts() {
  const alerts = await prisma.stockAlert.findMany({
    where: { notifiedAt: null },
    include: {
      product: { include: { variants: true } },
    },
    take: 100,
    orderBy: { createdAt: "asc" },
  });
  let sent = 0;
  for (const alert of alerts) {
    const product = alert.product;
    if (product.status !== ProductStatus.ACTIVE) continue;
    const variant = alert.variantKey
      ? product.variants.find((v) => v.id === alert.variantKey)
      : null;
    if (alert.variantKey && !variant) continue;
    const qty = variant ? variant.inventory : product.inventory;
    const inStock =
      product.type !== ProductType.PHYSICAL || qty == null || qty > 0;
    if (!inStock) continue;
    const label = variant ? `${product.title} (${variant.title})` : product.title;
    try {
      await sendEmail({
        to: alert.email,
        subject: `${label} is back in stock`,
        html: `<p>${label} is available again.</p><p><a href="${process.env.STOREFRONT_URL ?? "http://localhost:3002"}/products/${product.slug}">View product</a></p>`,
        text: `${label} is available again.`,
        template: "stock-alert",
      });
    } catch (e) {
      console.error("[stock-alert] email", alert.id, e);
      continue;
    }
    await prisma.stockAlert.update({
      where: { id: alert.id },
      data: { notifiedAt: new Date() },
    });
    sent += 1;
  }
  return { sent };
}
