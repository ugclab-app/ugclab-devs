import { prisma, ProductType } from "@ugclab/database";
import { getDefaultWarehouse } from "./inventory.js";

const STAGE_RANK: Record<string, number> = {
  browse: 0,
  cart: 1,
  checkout: 2,
  purchase: 3,
};

export type RoutingPreviewLine = {
  orderLineItemId: string;
  title: string;
  quantity: number;
  productId: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  stockOk: boolean;
};

export type RoutingPreviewGroup = {
  warehouseId: string | null;
  warehouseName: string;
  lines: RoutingPreviewLine[];
};

/** Assign each physical line to a warehouse with enough available stock. */
export async function routeOrderLinesToWarehouses(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;

  if (order.fulfillmentMethod === "PICKUP" && order.pickupWarehouseId) {
    for (const line of order.items) {
      if (line.product?.type !== ProductType.PHYSICAL) continue;
      await prisma.orderLineItem.update({
        where: { id: line.id },
        data: { warehouseId: order.pickupWarehouseId },
      });
    }
    return;
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: order.tenantId },
    include: { stock: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const fallback = await getDefaultWarehouse(order.tenantId);

  for (const line of order.items) {
    if (line.product?.type !== ProductType.PHYSICAL || !line.productId) continue;

    let chosen =
      warehouses.find((w) => {
        const s = w.stock.find(
          (x) =>
            x.productId === line.productId &&
            (x.variantId ?? null) === (line.variantId ?? null)
        );
        return s && s.quantity - s.reservedQty >= line.quantity;
      }) ?? fallback;

    if (chosen) {
      await prisma.orderLineItem.update({
        where: { id: line.id },
        data: { warehouseId: chosen.id },
      });
    }
  }
}

/** Dry-run of warehouse assignment without writing shipments. */
export async function previewFulfillmentRouting(
  orderId: string
): Promise<{ groups: RoutingPreviewGroup[]; alreadySplit: boolean }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      fulfillmentShipments: { select: { id: true } },
      pickupWarehouse: { select: { id: true, name: true } },
    },
  });
  if (!order) return { groups: [], alreadySplit: false };

  const alreadySplit = order.fulfillmentShipments.length > 0;
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: order.tenantId },
    include: { stock: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const whName = new Map(warehouses.map((w) => [w.id, w.name]));
  const fallback = await getDefaultWarehouse(order.tenantId);

  const lines: RoutingPreviewLine[] = [];
  for (const line of order.items) {
    if (line.product?.type !== ProductType.PHYSICAL) continue;
    const remaining = line.quantity - line.fulfilledQuantity;
    if (remaining <= 0) continue;

    let warehouseId: string | null = line.warehouseId;
    let stockOk = true;

    if (order.fulfillmentMethod === "PICKUP" && order.pickupWarehouseId) {
      warehouseId = order.pickupWarehouseId;
    } else if (!warehouseId) {
      const chosen =
        warehouses.find((w) => {
          const s = w.stock.find(
            (x) =>
              x.productId === line.productId &&
              (x.variantId ?? null) === (line.variantId ?? null)
          );
          return s && s.quantity - s.reservedQty >= remaining;
        }) ?? fallback;
      warehouseId = chosen?.id ?? null;
      if (chosen) {
        const stockRows = warehouses.find((w) => w.id === chosen.id)?.stock ?? [];
        const s = stockRows.find(
          (x) =>
            x.productId === line.productId &&
            (x.variantId ?? null) === (line.variantId ?? null)
        );
        stockOk = Boolean(s && s.quantity - s.reservedQty >= remaining);
      } else {
        stockOk = false;
      }
    } else {
      const wh = warehouses.find((w) => w.id === warehouseId);
      const s = wh?.stock.find(
        (x) =>
          x.productId === line.productId &&
          (x.variantId ?? null) === (line.variantId ?? null)
      );
      stockOk = Boolean(s && s.quantity - s.reservedQty >= remaining);
    }

    lines.push({
      orderLineItemId: line.id,
      title: line.title,
      quantity: remaining,
      productId: line.productId,
      warehouseId,
      warehouseName: warehouseId
        ? whName.get(warehouseId) ??
          (order.pickupWarehouseId === warehouseId
            ? order.pickupWarehouse?.name ?? "Pickup"
            : "Warehouse")
        : null,
      stockOk,
    });
  }

  const byWh = new Map<string, RoutingPreviewLine[]>();
  for (const l of lines) {
    const key = l.warehouseId ?? "unassigned";
    const list = byWh.get(key) ?? [];
    list.push(l);
    byWh.set(key, list);
  }

  const groups: RoutingPreviewGroup[] = [...byWh.entries()].map(([key, ls]) => ({
    warehouseId: key === "unassigned" ? null : key,
    warehouseName:
      key === "unassigned"
        ? "Unassigned"
        : ls[0]?.warehouseName ?? whName.get(key) ?? "Warehouse",
    lines: ls,
  }));

  return { groups, alreadySplit };
}

export async function createSplitFulfillments(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return [];

  const existing = await prisma.fulfillmentShipment.count({
    where: { orderId },
  });
  if (existing > 0) {
    return prisma.fulfillmentShipment.findMany({
      where: { orderId },
      include: { lines: true, warehouse: { select: { id: true, name: true } } },
    });
  }

  const byWh = new Map<string, typeof order.items>();
  for (const line of order.items) {
    const key = line.warehouseId || "unassigned";
    const list = byWh.get(key) ?? [];
    list.push(line);
    byWh.set(key, list);
  }

  const shipments = [];
  for (const [whId, lines] of byWh) {
    const createLines = lines
      .map((l) => ({
        orderLineItemId: l.id,
        quantity: l.quantity - l.fulfilledQuantity,
      }))
      .filter((l) => l.quantity > 0);
    if (createLines.length === 0) continue;

    const shipment = await prisma.fulfillmentShipment.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        warehouseId: whId === "unassigned" ? null : whId,
        status: "OPEN",
        lines: { create: createLines },
      },
      include: {
        lines: true,
        warehouse: { select: { id: true, name: true } },
      },
    });
    shipments.push(shipment);
  }
  return shipments;
}
