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
import { OrderShipmentsPanel } from "@/components/order-shipments-panel";
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
  const [toStoreCredit, setToStoreCredit] = useState(false);

  async function submit() {
    const lineItems = Object.entries(selected)
      .filter(([, q]) => q > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity }));
    if (lineItems.length === 0) {
      alert("Select at least one line");
      return;
    }
    if (
      !confirm(
        toStoreCredit
          ? "Refund selected items to the customer's store credit?"
          : "Issue partial refund in Stripe for selected items?"
      )
    )
      return;
    try {
      await api.refundOrder(orderId, {
        lineItems,
        ...(toStoreCredit ? { toStoreCredit: true } : {}),
      });
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
      <label className="flex items-center gap-2 pt-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={toStoreCredit}
          onChange={(e) => setToStoreCredit(e.target.checked)}
          className="rounded border-zinc-300"
        />
        Refund to store credit instead of card
      </label>
      <button type="button" onClick={() => void submit()} className="ugclab-btn border border-red-200 bg-red-50 text-xs text-red-800 mt-2">
        Refund selected
      </button>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [fullRefundToStoreCredit, setFullRefundToStoreCredit] = useState(false);
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
    invoiceNumber?: string | null;
    status: OrderStatus;
    trackingNumber: string | null;
    buyerProtection?: boolean;
    paymentCaptureStatus?: string | null;
    paymentHold?: boolean;
    fundsReleasedAt?: string | null;
    buyerReceivedAt?: string | null;
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
    shippingRegion?: string | null;
    shippingPostal?: string | null;
    shippingPhone?: string | null;
    shippingCountry?: string | null;
    shippingName?: string | null;
    supplierOrders?: {
      id: string;
      provider: string;
      externalOrderId: string | null;
      status: string;
      error: string | null;
    }[];
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
    affiliatePartner?: { displayName: string; code: string } | null;
    affiliateCommission?: {
      commissionCents: number;
      commissionBps: number;
      status: string;
      payoutNote: string | null;
    } | null;
    affiliateCommissionCents?: number;
    riskScore?: number | null;
    riskLevel?: string | null;
    fulfillmentMethod?: string | null;
    pickupReadyAt?: string | null;
    pickupWarehouseId?: string | null;
    loyaltyPointsSpent?: number;
    loyaltyDiscountAmount?: number;
    tipAmount?: number | null;
    storeCreditAmount?: number | null;
    customFields?: Record<string, string> | null;
    digitalDownloads?: Array<{
      id: string;
      licenseKey: string | null;
      product: { title: string } | null;
    }>;
  };

  const paymentModel = (data as { paymentModel?: string }).paymentModel ?? "mor";
  const mor = paymentModel === "mor";
  const platformFee = order.platformFeeAmount ?? 0;
  const merchantNet = Math.max(0, order.totalAmount - platformFee);
  const showCaptureActions =
    order.paymentCaptureStatus === "AUTHORIZED" || !!order.paymentHold;

  async function refreshOrder() {
    await qc.invalidateQueries({ queryKey: ["order", id] });
    await qc.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <AdminPageShell
      crumbs={[
        { label: "Orders", to: "/orders" },
        { label: `#${order.orderNumber}` },
      ]}
      title={`Order #${order.orderNumber}`}
      description={order.invoiceNumber ? `Invoice ${order.invoiceNumber}` : undefined}
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
            <span className="inline-flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (
                    !confirm(
                      fullRefundToStoreCredit
                        ? "Refund the full order to the customer's store credit and mark as refunded?"
                        : mor && order.stripePaymentId
                          ? "Refund in Stripe and mark order as refunded?"
                          : "Mark this order as refunded?"
                    )
                  )
                    return;
                  try {
                    await api.refundOrder(
                      order.id,
                      fullRefundToStoreCredit ? { toStoreCredit: true } : undefined
                    );
                    await qc.invalidateQueries({ queryKey: ["order", id] });
                    await qc.invalidateQueries({ queryKey: ["orders"] });
                  } catch (e) {
                    alert(e instanceof Error ? e.message : "Refund failed");
                  }
                }}
                className="ugclab-btn border border-red-200 bg-red-50 text-sm text-red-800"
              >
                {fullRefundToStoreCredit
                  ? "Refund (store credit)"
                  : mor && order.stripePaymentId
                    ? "Refund (Stripe)"
                    : "Refund"}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={fullRefundToStoreCredit}
                  onChange={(e) => setFullRefundToStoreCredit(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                To store credit
              </label>
            </span>
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
          {showCaptureActions ? (
            <>
              {order.paymentCaptureStatus === "AUTHORIZED" ? (
                <>
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary text-sm"
                    onClick={async () => {
                      if (!confirm("Capture authorized payment?")) return;
                      try {
                        await api.captureOrder(order.id);
                        await refreshOrder();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Capture failed");
                      }
                    }}
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    onClick={async () => {
                      if (!confirm("Void this authorization?")) return;
                      try {
                        await api.voidAuthorization(order.id);
                        await refreshOrder();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Void failed");
                      }
                    }}
                  >
                    Void
                  </button>
                </>
              ) : null}
              {order.paymentHold ? (
                <button
                  type="button"
                  className="ugclab-btn border border-amber-200 bg-amber-50 text-sm text-amber-900"
                  onClick={async () => {
                    if (!confirm("Release payment hold?")) return;
                    try {
                      await api.releaseHold(order.id);
                      await refreshOrder();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Release failed");
                    }
                  }}
                >
                  Release hold
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            onClick={async () => {
              try {
                const preview = await api.fulfillmentPreview(order.id);
                const groups = (preview.groups ?? []) as {
                  warehouseName: string;
                  lines: { title: string; quantity: number; stockOk: boolean }[];
                }[];
                if (preview.alreadySplit) {
                  alert("Shipments already exist for this order.");
                  return;
                }
                const summary = groups
                  .map(
                    (g) =>
                      `• ${g.warehouseName}: ${g.lines
                        .map((l) => `${l.title}×${l.quantity}${l.stockOk ? "" : " (low stock)"}`)
                        .join(", ")}`
                  )
                  .join("\n");
                if (
                  !confirm(
                    `Split into ${groups.length} warehouse shipment(s)?\n\n${summary || "No lines"}`
                  )
                )
                  return;
                const r = await api.splitFulfillments(order.id);
                alert(`Created ${r.shipments?.length ?? 0} shipment(s)`);
                await refreshOrder();
                await qc.invalidateQueries({
                  queryKey: ["order-fulfillments", order.id],
                });
                await qc.invalidateQueries({
                  queryKey: ["order-fulfillment-preview", order.id],
                });
              } catch (e) {
                alert(e instanceof Error ? e.message : "Split failed");
              }
            }}
          >
            Split fulfillments
          </button>
          {order.fulfillmentMethod === "PICKUP" && !order.pickupReadyAt ? (
            <button
              type="button"
              className="ugclab-btn ugclab-btn-primary text-sm"
              onClick={async () => {
                if (!confirm("Mark ready for pickup and email the customer?")) return;
                try {
                  await api.markOrderReadyForPickup(order.id);
                  await refreshOrder();
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Ready for pickup
            </button>
          ) : null}
          {order.fulfillmentMethod === "PICKUP" && order.pickupReadyAt ? (
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
              Ready since {new Date(order.pickupReadyAt).toLocaleString()}
            </span>
          ) : null}
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
          {order.digitalDownloads && order.digitalDownloads.some((d) => d.licenseKey) ? (
            <div className="border-t border-zinc-100 px-6 py-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                License keys
              </p>
              <ul className="mt-2 space-y-1.5">
                {order.digitalDownloads
                  .filter((d) => d.licenseKey)
                  .map((d) => (
                    <li key={d.id} className="flex flex-wrap gap-2">
                      <span className="text-zinc-600">
                        {d.product?.title ?? "Digital"}:
                      </span>
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                        {d.licenseKey}
                      </code>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {(order.loyaltyPointsSpent ?? 0) > 0 ? (
            <p className="border-t border-zinc-100 px-6 py-3 text-xs text-zinc-500">
              Loyalty: −{order.loyaltyPointsSpent} pts
              {order.loyaltyDiscountAmount
                ? ` (${formatMoney(order.loyaltyDiscountAmount, data.currency)})`
                : ""}
            </p>
          ) : null}
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
            {(order.tipAmount ?? 0) > 0 || (order.storeCreditAmount ?? 0) > 0 ? (
              <dl className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                {(order.tipAmount ?? 0) > 0 ? (
                  <div className="flex justify-between">
                    <dt>Tip</dt>
                    <dd className="font-medium text-zinc-800">
                      {formatMoney(order.tipAmount ?? 0, data.currency)}
                    </dd>
                  </div>
                ) : null}
                {(order.storeCreditAmount ?? 0) > 0 ? (
                  <div className="flex justify-between">
                    <dt>Store credit</dt>
                    <dd className="font-medium text-zinc-800">
                      −{formatMoney(order.storeCreditAmount ?? 0, data.currency)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
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
            {order.affiliatePartner ? (
              <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <dt>Referred by</dt>
                  <dd className="font-medium text-zinc-800">
                    {order.affiliatePartner.displayName}
                    <span className="font-mono text-zinc-400"> ({order.affiliatePartner.code})</span>
                  </dd>
                </div>
                {(order.affiliateCommission?.commissionCents ??
                  order.affiliateCommissionCents) ? (
                  <div className="flex justify-between">
                    <dt>Creator commission</dt>
                    <dd className="font-semibold text-violet-700">
                      {formatMoney(
                        order.affiliateCommission?.commissionCents ??
                          order.affiliateCommissionCents ??
                          0,
                        data.currency
                      )}
                      {order.affiliateCommission?.status ? (
                        <span className="ml-1 font-normal text-zinc-500">
                          · {order.affiliateCommission.status}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                <p className="text-zinc-400">You pay the creator off-platform.</p>
              </dl>
            ) : null}
            {order.stripePaymentId ? (
              <p className="mt-2 font-mono text-[10px] text-zinc-400 break-all">
                Stripe: {order.stripePaymentId}
              </p>
            ) : null}
            {order.buyerProtection && order.paymentCaptureStatus === "AUTHORIZED" ? (
              <p className="mt-2 text-sm text-amber-800">
                Funds reserved. The buyer is charged when you ship
                {order.shippingCountry === "KG" ? " (tracking is optional for Kyrgyzstan)" : " with a tracking number"}.
              </p>
            ) : null}
            {order.buyerProtection &&
            (order.status === "PAID" || order.status === "FULFILLED") &&
            !order.fundsReleasedAt ? (
              <p className="mt-2 text-sm text-amber-800">
                Charged. Payout waits until the buyer confirms receipt or the protection window ends.
              </p>
            ) : null}
            {order.fundsReleasedAt ? (
              <p className="mt-2 text-sm text-emerald-800">Payout released for this order.</p>
            ) : null}
            {order.paymentCaptureStatus && order.paymentCaptureStatus !== "NONE" ? (
              <p className="mt-2 text-xs text-zinc-600">
                Capture: {order.paymentCaptureStatus}
                {order.paymentHold ? " · on hold" : ""}
              </p>
            ) : order.paymentHold ? (
              <p className="mt-2 text-xs text-amber-700">Payment hold</p>
            ) : null}
            {order.riskScore != null || order.riskLevel ? (
              <p className="mt-2 text-xs text-zinc-600">
                Risk: {order.riskLevel ?? "—"}
                {order.riskScore != null ? ` (${order.riskScore})` : ""}
              </p>
            ) : null}
            {order.trackingNumber ? (
              <p className="mt-3 font-mono text-xs text-zinc-600">
                Tracking: {order.trackingNumber}
              </p>
            ) : null}
          </section>
          {order.customFields && Object.keys(order.customFields).length > 0 ? (
            <section className="admin-card p-6 text-sm">
              <h3 className="font-semibold">Checkout fields</h3>
              <dl className="mt-3 space-y-2 text-xs text-zinc-600">
                {Object.entries(order.customFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-zinc-500">{key}</dt>
                    <dd className="whitespace-pre-wrap break-words text-right font-medium text-zinc-800">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {order.supplierOrders?.length ? (
            <section className="admin-card p-6 text-sm">
              <h3 className="font-semibold">Supplier</h3>
              {supplierError ? <p className="mt-2 text-xs text-red-700">{supplierError}</p> : null}
              <ul className="mt-3 space-y-3">
                {order.supplierOrders.map((row) => (
                  <li key={row.id} className="rounded-xl border border-zinc-100 p-3">
                    <p className="font-medium text-zinc-900">
                      {row.provider} · {row.status}
                    </p>
                    {row.externalOrderId ? (
                      <p className="mt-1 font-mono text-xs text-zinc-600">Their order: {row.externalOrderId}</p>
                    ) : null}
                    {row.error ? <p className="mt-1 text-xs text-red-700">{row.error}</p> : null}
                    {row.status !== "SUBMITTED" ? (
                      <button
                        type="button"
                        className="ugclab-btn mt-2 border border-zinc-200 bg-white text-xs"
                        onClick={async () => {
                          setSupplierError(null);
                          try {
                            await api.pushSupplierOrder(order.id);
                            void qc.invalidateQueries({ queryKey: ["order", id] });
                          } catch (err) {
                            setSupplierError(err instanceof Error ? err.message : "Could not send the order.");
                          }
                        }}
                      >
                        Send again
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <OrderFulfillmentForm
            orderId={order.id}
            trackingNumber={order.trackingNumber}
            status={order.status}
          />
          <OrderShipmentsPanel orderId={order.id} />
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
              shippingRegion: order.shippingRegion,
              shippingPhone: order.shippingPhone,
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
