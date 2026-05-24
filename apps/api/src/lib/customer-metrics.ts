import { OrderStatus } from "@ugclab/database";

export const CUSTOMER_VIP_SPENT_CENTS = 50_000;

const PAID_STATUSES: OrderStatus[] = [OrderStatus.PAID, OrderStatus.FULFILLED];

export type CustomerOrderSlice = {
  totalAmount: number;
  createdAt: Date;
  status: OrderStatus;
};

export type CustomerMetrics = {
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  aov: number;
  lastOrderAt: Date | null;
  firstOrderAt: Date | null;
  segment: string[];
};

export function computeCustomerMetrics(
  orders: CustomerOrderSlice[],
  totalOrderCount: number
): CustomerMetrics {
  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const totalSpent = paid.reduce((s, o) => s + o.totalAmount, 0);
  const paidOrderCount = paid.length;
  const lastOrderAt =
    orders.length > 0
      ? orders.reduce(
          (latest, o) => (o.createdAt > latest ? o.createdAt : latest),
          orders[0]!.createdAt
        )
      : null;
  const firstOrderAt =
    orders.length > 0
      ? orders.reduce(
          (earliest, o) => (o.createdAt < earliest ? o.createdAt : earliest),
          orders[0]!.createdAt
        )
      : null;

  const segment: string[] = [];
  if (totalSpent >= CUSTOMER_VIP_SPENT_CENTS) segment.push("vip");
  if (paidOrderCount >= 2) segment.push("repeat");
  if (paidOrderCount === 0) segment.push("new");
  else if (segment.length === 0) segment.push("active");

  const aov =
    paidOrderCount > 0 ? Math.round(totalSpent / paidOrderCount) : 0;

  return {
    orderCount: totalOrderCount,
    paidOrderCount,
    totalSpent,
    aov,
    lastOrderAt,
    firstOrderAt,
    segment,
  };
}

export type CustomerListFilter =
  | "all"
  | "vip"
  | "repeat"
  | "new"
  | "with_orders"
  | "no_orders";

export function matchesCustomerFilter(
  segment: string[],
  orderCount: number,
  filter: CustomerListFilter
): boolean {
  switch (filter) {
    case "vip":
      return segment.includes("vip");
    case "repeat":
      return segment.includes("repeat");
    case "new":
      return segment.includes("new");
    case "with_orders":
      return orderCount > 0;
    case "no_orders":
      return orderCount === 0;
    default:
      return true;
  }
}

export type CustomerListSort = "newest" | "spent" | "orders" | "last_order";

export function sortCustomerRows<T extends CustomerMetrics & { createdAt: Date }>(
  rows: T[],
  sort: CustomerListSort
): T[] {
  const copy = [...rows];
  switch (sort) {
    case "spent":
      return copy.sort((a, b) => b.totalSpent - a.totalSpent);
    case "orders":
      return copy.sort((a, b) => b.orderCount - a.orderCount);
    case "last_order":
      return copy.sort((a, b) => {
        const at = a.lastOrderAt?.getTime() ?? 0;
        const bt = b.lastOrderAt?.getTime() ?? 0;
        return bt - at;
      });
    default:
      return copy.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
  }
}

export function customerMetricsToCsv(
  rows: {
    email: string;
    name: string | null;
    country: string | null;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: Date | null;
    segment: string[];
  }[]
): string {
  const header =
    "email,name,country,orders,total_spent_cents,last_order,segments\n";
  const body = rows
    .map((r) =>
      [
        r.email,
        `"${(r.name ?? "").replace(/"/g, '""')}"`,
        r.country ?? "",
        r.orderCount,
        r.totalSpent,
        r.lastOrderAt ? r.lastOrderAt.toISOString().slice(0, 10) : "",
        `"${r.segment.join(";")}"`,
      ].join(",")
    )
    .join("\n");
  return header + body;
}
