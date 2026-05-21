import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { OrderStatusBadge } from "@/components/status-badge";
import { OrderStatusForm } from "@/components/order-status-form";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderFulfillmentForm } from "@/components/order-fulfillment-form";
import { OrderLineFulfillment } from "@/components/order-line-fulfillment";
import { OrderNotes } from "@/components/order-notes";
import type { OrderStatus } from "@/lib/database-types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.order(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const order = data.order as {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    trackingNumber: string | null;
    shippedAt: string | null;
    totalAmount: number;
    subtotalAmount: number;
    shippingAmount: number;
    taxAmount: number;
    customer?: { email: string; name: string | null } | null;
    shippingAddress1?: string | null;
    items: {
      id: string;
      title: string;
      quantity: number;
      fulfilledQuantity: number;
      unitAmount: number;
      totalAmount: number;
    }[];
    events?: {
      id: string;
      type: string;
      body: string | null;
      authorEmail: string | null;
      createdAt: string;
    }[];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/orders" className="text-sm text-zinc-500 hover:text-violet-600">
          ← Orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.open(api.orderInvoiceUrl(order.id), "_blank")}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Print invoice
          </button>
          <button
            type="button"
            onClick={() => window.open(api.orderPackingUrl(order.id), "_blank")}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Packing slip
          </button>
          {order.shippingAddress1 ? (
            <button
              type="button"
              className="ugclab-btn border border-zinc-200 bg-white text-sm"
              onClick={async () => {
                if (!confirm("Create shipping label via Shippo? Requires SHIPPO_API_KEY.")) return;
                try {
                  const res = await api.createShippingLabel(order.id);
                  if (res.label?.labelUrl) window.open(res.label.labelUrl, "_blank");
                  window.location.reload();
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Label failed");
                }
              }}
            >
              Shippo label
            </button>
          ) : null}
          {order.status !== "REFUNDED" ? (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Mark this order as refunded?")) return;
                await api.refundOrder(order.id);
                window.location.reload();
              }}
              className="ugclab-btn border border-red-200 bg-red-50 text-sm text-red-800"
            >
              Refund
            </button>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              try {
                await api.resendOrderReceipt(order.id);
                alert("Receipt sent");
              } catch (e) {
                alert(e instanceof Error ? e.message : "Failed");
              }
            }}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Resend receipt
          </button>
        </div>
      </div>
      <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="admin-card overflow-hidden lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-6 py-4">{i.title}</td>
                  <td className="px-6 py-4">{i.quantity}</td>
                  <td className="px-6 py-4 text-right">
                    {formatMoney(i.totalAmount, data.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="space-y-6">
          <section className="admin-card p-6">
            <OrderStatusBadge status={order.status} />
            <div className="mt-4">
              <OrderStatusForm orderId={order.id} currentStatus={order.status} />
            </div>
          </section>
          <section className="admin-card p-6 text-sm">
            <p className="font-medium">{order.customer?.email ?? "Guest"}</p>
            <p className="mt-4 text-xl font-bold">
              {formatMoney(order.totalAmount, data.currency)}
            </p>
            {order.trackingNumber ? (
              <p className="mt-3 font-mono text-xs text-zinc-600">
                Tracking: {order.trackingNumber}
              </p>
            ) : null}
          </section>
          <OrderFulfillmentForm
            orderId={order.id}
            trackingNumber={order.trackingNumber}
            status={order.status}
          />
          <OrderLineFulfillment orderId={order.id} items={order.items} />
          <OrderNotes orderId={order.id} />
        </div>
      </div>
      <OrderTimeline orderId={order.id} events={order.events ?? []} />
    </div>
  );
}
