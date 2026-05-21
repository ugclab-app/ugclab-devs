import { prisma, ProductStatus, ProductType } from "@ugclab/database";
import { sendEmail } from "./email.js";

export async function checkLowStockForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true, owner: true },
  });
  if (!tenant?.settings?.notifyLowStock || !tenant.owner?.email) return;

  const threshold = tenant.settings.lowStockThreshold ?? 5;
  const last = tenant.settings.lowStockLastNotifiedAt;
  if (last) {
    const hours = (Date.now() - last.getTime()) / (1000 * 60 * 60);
    if (hours < 24) return;
  }

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      status: ProductStatus.ACTIVE,
      type: ProductType.PHYSICAL,
      inventory: { lte: threshold },
    },
    select: { id: true, title: true, inventory: true },
    take: 50,
  });

  if (products.length === 0) return;

  const adminUrl = process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001";
  const list = products
    .map((p) => `<li>${p.title} — ${p.inventory ?? 0} left</li>`)
    .join("");

  await sendEmail({
    to: tenant.owner.email,
    subject: `Low stock alert — ${tenant.name}`,
    html: `
      <h2>Low stock (${products.length} product${products.length === 1 ? "" : "s"})</h2>
      <p>Threshold: ${threshold} units or fewer.</p>
      <ul>${list}</ul>
      <p><a href="${adminUrl}/products?lowStock=1">View in admin →</a></p>
    `,
  });

  await prisma.storeSettings.update({
    where: { tenantId },
    data: { lowStockLastNotifiedAt: new Date() },
  });
}

export async function checkLowStockAfterInventoryChange(
  tenantId: string,
  productId: string
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { inventory: true, type: true, status: true, tenantId: true },
  });
  if (!product || product.tenantId !== tenantId) return;
  if (product.type !== ProductType.PHYSICAL || product.status !== ProductStatus.ACTIVE)
    return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });
  const threshold = tenant?.settings?.lowStockThreshold ?? 5;
  if ((product.inventory ?? 0) > threshold) return;

  await checkLowStockForTenant(tenantId);
}
