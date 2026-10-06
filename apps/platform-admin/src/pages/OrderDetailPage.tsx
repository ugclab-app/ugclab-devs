import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { useState } from "react";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type OrderDetail = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ownerId: string;
  ownerEmail: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  platformFeeAmount: number;
  paymentProvider: string | null;
  stripePaymentId: string | null;
  stripeCheckoutSessionId: string | null;
  gopayPaymentId: string | null;
  finikPaymentId: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  shippingCountry: string | null;
  shippingName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingPostal: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    fulfilledQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    body: string | null;
    createdAt: string;
    authorEmail: string | null;
  }[];
  siblingOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
  }[];
};

const merchantUrl =
  import.meta.env.VITE_MERCHANT_ADMIN_URL ?? "http://localhost:3001";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [lineQty, setLineQty] = useState<Record<string, number>>({});

  const query = useQuery({
    queryKey: ["platform-order", id],
    queryFn: () => api.order(id!),
    enabled: Boolean(id),
  });

  async function run(action: () => Promise<unknown>, ok: string) {
    setPending(true);
    setMsg(null);
    try {
      await action();
      setMsg(ok);
      await qc.invalidateQueries({ queryKey: ["platform-order", id] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/orders" className="text-sm text-sky-600 hover:underline">
          ← Orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Order detail</h1>
      </div>

      <QueryState query={query}>
        {(data) => {
          const o = data.order as OrderDetail;
          const canMarkPaid = o.status === "PENDING" || o.status === "DRAFT";
          const canCancel = o.status === "PENDING" || o.status === "DRAFT";
          const canRefund = o.status === "PAID" || o.status === "FULFILLED";
          const canFulfill = o.status === "PAID" || o.status === "FULFILLED";
          const unpaid = o.status === "PENDING" || o.status === "DRAFT";
          const addressParts = [
            o.shippingName,
            o.shippingAddress1,
            o.shippingAddress2,
            [o.shippingCity, o.shippingPostal].filter(Boolean).join(" "),
            o.shippingCountry,
          ].filter(Boolean);
          const hasStreet = Boolean(o.shippingAddress1?.trim());

          return (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-semibold">#{o.orderNumber}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(o.createdAt).toLocaleString()} · {o.status}
                  </p>
                  <Link
                    to={`/tenants/${o.tenantId}`}
                    className="mt-1 inline-block text-sm text-sky-600 hover:underline"
                  >
                    {o.tenantName} ({o.tenantSlug})
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canMarkPaid ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                      onClick={() =>
                        run(() => api.markOrderPaid(o.id), "Marked as paid")
                      }
                    >
                      Mark paid
                    </button>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn border border-slate-200 bg-white text-sm disabled:opacity-50"
                      onClick={() => {
                        if (!confirm("Cancel this order?")) return;
                        void run(() => api.cancelOrder(o.id), "Cancelled");
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {canRefund ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn border border-red-200 bg-white text-sm text-red-700 disabled:opacity-50"
                      onClick={() => {
                        if (!confirm("Refund this order (full amount)?")) return;
                        void run(
                          () => api.refundOrder(o.id, { reason: "Platform admin" }),
                          "Refunded"
                        );
                      }}
                    >
                      Refund
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ugclab-btn border border-slate-200 bg-white text-sm"
                    onClick={() => window.open(api.orderInvoiceUrl(o.id), "_blank")}
                  >
                    PDF / Print invoice
                  </button>
                  <button
                    type="button"
                    className="ugclab-btn border border-slate-200 bg-white text-sm"
                    onClick={() => window.open(api.orderPackingUrl(o.id), "_blank")}
                  >
                    Packing slip
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="ugclab-btn border border-slate-200 bg-white text-sm disabled:opacity-50"
                    onClick={() =>
                      run(() => api.resyncOrder(o.id), "Synced from Stripe")
                    }
                  >
                    Sync Stripe
                  </button>
                  {o.stripePaymentId ? (
                    <a
                      href={`https://dashboard.stripe.com/payments/${o.stripePaymentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ugclab-btn border border-slate-200 bg-white text-sm"
                    >
                      Stripe ↗
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    className="ugclab-btn border border-sky-200 bg-sky-50 text-sm text-sky-800 disabled:opacity-50"
                    onClick={async () => {
                      setPending(true);
                      setMsg(null);
                      try {
                        const { url } = await api.impersonateUser(o.ownerId);
                        const next = encodeURIComponent(`/orders/${o.id}`);
                        window.open(`${url}&next=${next}`, "_blank", "noopener");
                        setMsg("Opened merchant admin as store owner");
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Impersonate failed");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    Open in merchant
                  </button>
                </div>
              </div>

              {msg ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                  {msg}
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="platform-card p-4">
                  <p className="text-xs uppercase text-slate-500">Customer</p>
                  <p className="mt-1 font-medium">{o.customerEmail ?? "—"}</p>
                  <p className="text-sm text-slate-600">{o.customerName ?? "—"}</p>
                  {o.customerId ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Customer ID{" "}
                      <span className="font-mono">{o.customerId.slice(0, 10)}…</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Guest checkout</p>
                  )}
                  <a
                    href={`${merchantUrl}/customers`}
                    className="mt-2 inline-block text-xs text-sky-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Merchant customers ↗
                  </a>
                </div>
                <div className="platform-card p-4">
                  <p className="text-xs uppercase text-slate-500">Payment</p>
                  {unpaid ? (
                    <>
                      <p className="mt-1 font-medium text-amber-700">Unpaid</p>
                      <p className="text-xs text-slate-500">Awaiting payment</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 font-medium">
                        {o.paymentProvider ?? "Paid"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {o.stripePaymentId ||
                          o.finikPaymentId ||
                          o.gopayPaymentId ||
                          "No provider id"}
                      </p>
                    </>
                  )}
                </div>
                <div className="platform-card p-4">
                  <p className="text-xs uppercase text-slate-500">Totals</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Subtotal</dt>
                      <dd>{formatMoney(o.subtotalAmount, o.currency)}</dd>
                    </div>
                    {o.discountAmount > 0 ? (
                      <div className="flex justify-between gap-4 text-emerald-700">
                        <dt>Discount</dt>
                        <dd>−{formatMoney(o.discountAmount, o.currency)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Shipping</dt>
                      <dd>{formatMoney(o.shippingAmount, o.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Tax</dt>
                      <dd>{formatMoney(o.taxAmount, o.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1 font-semibold">
                      <dt>Total</dt>
                      <dd>{formatMoney(o.totalAmount, o.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 text-xs text-slate-500">
                      <dt>Platform fee</dt>
                      <dd>{formatMoney(o.platformFeeAmount, o.currency)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="platform-card p-4 text-sm">
                <p className="text-xs uppercase text-slate-500">Shipping</p>
                {addressParts.length ? (
                  <p className="mt-1 whitespace-pre-line">
                    {addressParts.join("\n")}
                  </p>
                ) : (
                  <p className="mt-1 text-slate-500">No shipping address on order</p>
                )}
                {!hasStreet && o.shippingCountry ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Country only ({o.shippingCountry}) — street/city not provided
                  </p>
                ) : null}
                {o.trackingNumber ? (
                  <p className="mt-2 font-mono text-xs">
                    Tracking: {o.trackingNumber}
                    {o.shippedAt
                      ? ` · shipped ${new Date(o.shippedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="platform-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Fulfilled</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {o.items.map((i) => (
                      <tr key={i.id}>
                        <td className="px-4 py-2">{i.title}</td>
                        <td className="px-4 py-2">{i.quantity}</td>
                        <td className="px-4 py-2">
                          {canFulfill ? (
                            <input
                              type="number"
                              min={0}
                              max={i.quantity}
                              className="ugclab-input w-16 py-1 text-sm"
                              defaultValue={i.fulfilledQuantity}
                              onChange={(e) =>
                                setLineQty((prev) => ({
                                  ...prev,
                                  [i.id]: parseInt(e.target.value, 10) || 0,
                                }))
                              }
                            />
                          ) : (
                            i.fulfilledQuantity
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(i.totalAmount, o.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canFulfill ? (
                <section className="platform-card space-y-3 p-4">
                  <h2 className="font-semibold">Fulfillment</h2>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block text-sm">
                      Tracking number
                      <input
                        className="ugclab-input mt-1 min-w-[14rem]"
                        value={tracking || o.trackingNumber || ""}
                        onChange={(e) => setTracking(e.target.value)}
                        placeholder="1Z…"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn border border-slate-200 bg-white text-sm disabled:opacity-50"
                      onClick={() =>
                        run(
                          () =>
                            api.updateOrderFulfillment(o.id, {
                              trackingNumber: tracking || o.trackingNumber || undefined,
                            }),
                          "Tracking saved"
                        )
                      }
                    >
                      Save tracking
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                      onClick={() =>
                        run(
                          () =>
                            api.updateOrderFulfillment(o.id, {
                              trackingNumber: tracking || o.trackingNumber || undefined,
                              markFulfilled: true,
                            }),
                          "Marked fulfilled"
                        )
                      }
                    >
                      Mark shipped
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn border border-slate-200 bg-white text-sm disabled:opacity-50"
                      onClick={() =>
                        run(
                          () =>
                            api.updateOrderLineFulfillment(o.id, {
                              items: o.items.map((i) => ({
                                lineId: i.id,
                                fulfilledQuantity:
                                  lineQty[i.id] ?? i.fulfilledQuantity,
                              })),
                            }),
                          "Line fulfillment saved"
                        )
                      }
                    >
                      Save line qty
                    </button>
                  </div>
                </section>
              ) : null}

              {o.siblingOrders?.length ? (
                <section>
                  <h2 className="mb-2 text-lg font-semibold">Other orders (same customer)</h2>
                  <ul className="platform-card divide-y text-sm">
                    {o.siblingOrders.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        <Link
                          to={`/orders/${s.id}`}
                          className="font-mono text-sky-600 hover:underline"
                        >
                          #{s.orderNumber}
                        </Link>
                        <span className="text-slate-500">{s.status}</span>
                        <span>{formatMoney(s.totalAmount, s.currency)}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="platform-card space-y-3 p-4">
                <h2 className="font-semibold">Internal note</h2>
                <textarea
                  className="ugclab-input w-full min-h-[4rem] text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Visible on order timeline…"
                />
                <button
                  type="button"
                  disabled={pending || !note.trim()}
                  className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                  onClick={() => {
                    const text = note.trim();
                    void run(async () => {
                      await api.addOrderNote(o.id, text);
                      setNote("");
                    }, "Note added");
                  }}
                >
                  Add note
                </button>
              </section>

              <section>
                <h2 className="mb-2 text-lg font-semibold">Timeline</h2>
                <ul className="platform-card divide-y text-sm">
                  {o.events.map((e) => (
                    <li key={e.id} className="px-4 py-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{e.type}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(e.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {e.body ? <p className="mt-1 text-slate-600">{e.body}</p> : null}
                      {e.authorEmail ? (
                        <p className="text-xs text-slate-400">{e.authorEmail}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
