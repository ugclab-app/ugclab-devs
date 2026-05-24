import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { OrderStatusBadge } from "@/components/status-badge";
import { OrderStatusForm } from "@/components/order-status-form";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderFulfillmentForm } from "@/components/order-fulfillment-form";
import { OrderLineFulfillment } from "@/components/order-line-fulfillment";
import { OrderNotes } from "@/components/order-notes";
import { AdminPageShell } from "@/components/admin-page-shell";
import { OrderShippoPanel } from "@/components/order-shippo-panel";
import { OrderEditPanel, OrderTagsEditor } from "@/components/order-edit-panel";
import type { OrderStatus } from "@/lib/database-types";

function PartialRefundForm({
  orderId,
  items,
  currency,
  onDone,
}: {
  orderId: string;
  items: { id: string; title: string; quantity: number; unitAmount: number }[];
  currency: string;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, number>>({});

  async function submit() {
    const lineItems = Object.entries(selected)
      .filter(([, q]) => q > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity }));
    if (lineItems.length === 0) {
      alert("Select at least one line");
      return;
    }
    if (!confirm("Issue partial refund in Stripe for selected items?")) return;
    try {
      await api.refundOrder(orderId, { lineItems });
      onDone();
      alert("Partial refund submitted");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Refund failed");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {items.map((line) => (
        <label key={line.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(selected[line.id] ?? 0) > 0}
            onChange={(e) =>
              setSelected((s) => ({
                ...s,
                [line.id]: e.target.checked ? line.quantity : 0,
              }))
            }
          />
          <span className="flex-1 truncate">{line.title}</span>
          <span className="text-zinc-500">{formatMoney(line.unitAmount * line.quantity, currency)}</span>
        </label>
      ))}
      <button type="button" onClick={() => void submit()} className="ugclab-btn border border-red-200 bg-red-50 text-xs text-red-800 mt-2">
        Refund selected
      </button>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.order(id!),
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <AdminPageShell crumbs={[{ label: "Orders", to: "/orders" }, { label: "…" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  const order = data.order as {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    trackingNumber: string | null;
    shippedAt: string | null;
    totalAmount: number;
    platformFeeAmount?: number;
    stripePaymentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    subtotalAmount: number;
    shippingAmount: number;
    taxAmount: number;
    customer?: { email: string; name: string | null } | null;
    shippingAddress1?: string | null;
    shippingAddress2?: string | null;
    shippingCity?: string | null;
    shippingPostal?: string | null;
    shippingCountry?: string | null;
    shippingName?: string | null;
    tags?: string[];
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

  const paymentModel = (data as { paymentModel?: string }).paymentModel ?? "mor";
  const mor = paymentModel === "mor";
  const platformFee = order.platformFeeAmount ?? 0;
  const merchantNet = Math.max(0, order.totalAmount - platformFee);

  return (
    <AdminPageShell
      crumbs={[
        { label: "Orders", to: "/orders" },
        { label: `#${order.orderNumber}` },
      ]}
      title={`Order #${order.orderNumber}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {order.status === "PENDING" ? (
            <>
              <button
                type="button"
                className="ugclab-btn ugclab-btn-primary text-sm"
                onClick={async () => {
                  if (
                    !confirm(
                      "Mark as paid? Use if Stripe payment succeeded but webhook did not run."
                    )
                  )
                    return;
                  try {
                    await api.markDraftPaid(order.id);
                    await qc.invalidateQueries({ queryKey: ["order", id] });
                    await qc.invalidateQueries({ queryKey: ["orders"] });
                  } catch (e) {
                    alert(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                Mark as paid
              </button>
              {order.stripePaymentId || order.stripeCheckoutSessionId ? (
                <button
                  type="button"
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  onClick={async () => {
                    try {
                      const r = await api.syncOrderStripe(order.id);
                      alert(r.message);
                      await qc.invalidateQueries({ queryKey: ["order", id] });
                      await qc.invalidateQueries({ queryKey: ["orders"] });
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Sync failed");
                    }
                  }}
                >
                  Sync from Stripe
                </button>
              ) : null}
            </>
          ) : null}
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
          {order.status === "PAID" || order.status === "FULFILLED" ? (
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    mor && order.stripePaymentId
                      ? "Refund in Stripe and mark order as refunded?"
                      : "Mark this order as refunded?"
                  )
                )
                  return;
                try {
                  await api.refundOrder(order.id);
                  await qc.invalidateQueries({ queryKey: ["order", id] });
                  await qc.invalidateQueries({ queryKey: ["orders"] });
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Refund failed");
                }
              }}
              className="ugclab-btn border border-red-200 bg-red-50 text-sm text-red-800"
            >
              {mor && order.stripePaymentId ? "Refund (Stripe)" : "Refund"}
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
      }
    >
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
            {mor ? (
              <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <dt>Platform fee</dt>
                  <dd className="font-medium text-zinc-800">
                    {formatMoney(platformFee, data.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Your net (MoR)</dt>
                  <dd className="font-semibold text-emerald-700">
                    {formatMoney(merchantNet, data.currency)}
                  </dd>
                </div>
                <p className="text-zinc-400">
                  Collected on platform Stripe; payout via Payments.
                </p>
              </dl>
            ) : null}
            {order.stripePaymentId ? (
              <p className="mt-2 font-mono text-[10px] text-zinc-400 break-all">
                Stripe: {order.stripePaymentId}
              </p>
            ) : null}
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
          {(order.status === "PAID" || order.status === "FULFILLED") &&
          order.items.length >= 1 ? (
            <section className="admin-card p-6 text-sm">
              <h3 className="font-semibold">Partial refund</h3>
              <p className="mt-1 text-zinc-500 text-xs">
                Refund selected line items via Stripe (MoR).
              </p>
              <PartialRefundForm
                orderId={order.id}
                items={order.items}
                currency={data.currency}
                onDone={() => {
                  void qc.invalidateQueries({ queryKey: ["order", id] });
                }}
              />
            </section>
          ) : null}
          <OrderTagsEditor orderId={order.id} tags={order.tags ?? []} />
          <OrderEditPanel
            orderId={order.id}
            status={order.status}
            shipping={{
              shippingName: order.shippingName,
              shippingAddress1: order.shippingAddress1,
              shippingAddress2: order.shippingAddress2,
              shippingCity: order.shippingCity,
              shippingPostal: order.shippingPostal,
              shippingCountry: order.shippingCountry,
            }}
          />
          <OrderShippoPanel
            orderId={order.id}
            hasShippingAddress={Boolean(order.shippingAddress1)}
            trackingNumber={order.trackingNumber}
          />
          <OrderNotes orderId={order.id} />
        </div>
      </div>
      <OrderTimeline orderId={order.id} events={order.events ?? []} />
    </AdminPageShell>
  );
}
