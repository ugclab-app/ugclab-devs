import { OrderStatus, prisma, ProductType } from "@ugclab/database";

export async function getDefaultWarehouse(tenantId: string) {
  return prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function logInventoryMovement(opts: {
  tenantId: string;
  warehouseId?: string | null;
  productId: string;
  variantId?: string | null;
  type: string;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  authorEmail?: string;
}) {
  return prisma.inventoryMovement.create({
    data: {
      tenantId: opts.tenantId,
      warehouseId: opts.warehouseId ?? null,
      productId: opts.productId,
      variantId: opts.variantId ?? null,
      type: opts.type,
      quantityDelta: opts.quantityDelta,
      referenceType: opts.referenceType ?? null,
      referenceId: opts.referenceId ?? null,
      note: opts.note ?? null,
      authorEmail: opts.authorEmail ?? null,
    },
  });
}

async function upsertStock(
  warehouseId: string,
  productId: string,
  variantId: string | null
) {
  const existing = await prisma.warehouseStock.findFirst({
    where: { warehouseId, productId, variantId },
  });
  if (existing) return existing;
  return prisma.warehouseStock.create({
    data: { warehouseId, productId, variantId, quantity: 0, reservedQty: 0 },
  });
}

export async function reserveInventoryForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;
  const wh = await getDefaultWarehouse(order.tenantId);
  if (!wh) return;

  for (const line of order.items) {
    if (line.product?.type !== ProductType.PHYSICAL || !line.productId) continue;
    const stock = await upsertStock(wh.id, line.productId, line.variantId);
    const available = stock.quantity - stock.reservedQty;
    if (stock.quantity > 0 && available < line.quantity) {
      throw new Error(`Insufficient stock for ${line.title}`);
    }
    await prisma.warehouseStock.update({
      where: { id: stock.id },
      data: { reservedQty: { increment: line.quantity } },
    });
    await logInventoryMovement({
      tenantId: order.tenantId,
      warehouseId: wh.id,
      productId: line.productId,
      variantId: line.variantId,
      type: "ORDER_RESERVE",
      quantityDelta: -line.quantity,
      referenceType: "order",
      referenceId: order.id,
      note: `Reserved for order #${order.orderNumber}`,
    });
  }
}

export async function releaseInventoryForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;
  const wh = await getDefaultWarehouse(order.tenantId);
  if (!wh) return;

  for (const line of order.items) {
    if (line.product?.type !== ProductType.PHYSICAL || !line.productId) continue;
    const stock = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: wh.id,
        productId: line.productId,
        variantId: line.variantId,
      },
    });
    if (!stock) continue;
    const release = Math.min(line.quantity, stock.reservedQty);
    if (release <= 0) continue;
    await prisma.warehouseStock.update({
      where: { id: stock.id },
      data: { reservedQty: { decrement: release } },
    });
    await logInventoryMovement({
      tenantId: order.tenantId,
      warehouseId: wh.id,
      productId: line.productId,
      variantId: line.variantId,
      type: "ORDER_RELEASE",
      quantityDelta: release,
      referenceType: "order",
      referenceId: order.id,
      note: `Released reservation for order #${order.orderNumber}`,
    });
  }
}

export async function fulfillInventoryForOrder(
  orderId: string,
  authorEmail?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;
  const wh = await getDefaultWarehouse(order.tenantId);
  if (!wh) return;

  for (const line of order.items) {
    if (line.product?.type !== ProductType.PHYSICAL || !line.productId) continue;
    const stock = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: wh.id,
        productId: line.productId,
        variantId: line.variantId,
      },
    });
    if (!stock) continue;
    const fromReserve = Math.min(line.quantity, stock.reservedQty);
    await prisma.warehouseStock.update({
      where: { id: stock.id },
      data: {
        reservedQty: { decrement: fromReserve },
        quantity: { decrement: line.quantity },
      },
    });
    await logInventoryMovement({
      tenantId: order.tenantId,
      warehouseId: wh.id,
      productId: line.productId,
      variantId: line.variantId,
      type: "ORDER_FULFILL",
      quantityDelta: -line.quantity,
      referenceType: "order",
      referenceId: order.id,
      authorEmail,
      note: `Fulfilled order #${order.orderNumber}`,
    });
  }
}

export async function getSkuAlerts(tenantId: string) {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { lowStockThreshold: true },
  });
  const threshold = settings?.lowStockThreshold ?? 5;
  const stocks = await prisma.warehouseStock.findMany({
    where: { warehouse: { tenantId } },
    include: {
      product: { select: { id: true, title: true, sku: true, barcode: true } },
      warehouse: { select: { name: true } },
    },
  });
  return stocks
    .map((s) => ({
      ...s,
      available: s.quantity - s.reservedQty,
    }))
    .filter((s) => s.available <= threshold)
    .sort((a, b) => a.available - b.available);
}

export function canEditOrder(status: OrderStatus) {
  return status === OrderStatus.PENDING || status === OrderStatus.PAID;
}
