import { OrderStatus, ProductStatus } from "@ugclab/database";

const orderStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  FULFILLED: "bg-sky-50 text-sky-800 ring-sky-600/20",
  CANCELLED: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  REFUNDED: "bg-rose-50 text-rose-800 ring-rose-600/20",
};

const productStyles: Record<ProductStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  ARCHIVED: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${orderStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${productStyles[status]}`}
    >
      {status}
    </span>
  );
}
