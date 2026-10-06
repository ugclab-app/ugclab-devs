import { useRef, useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { CheckoutSteps } from "@/components/checkout-steps";
import { trackPurchase } from "@/lib/pixel-track";
import { trackingUrl } from "@/lib/tracking-url";

const FINIK_POLL_MS = 2500;
const FINIK_POLL_MAX_MS = 120_000;

function usePollStart(orderId: string | undefined): number {
  const started = useRef<{ id?: string; at: number }>({ at: Date.now() });
  if (started.current.id !== orderId) {
    started.current = { id: orderId, at: Date.now() };
  }
  return started.current.at;
}

export function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? undefined;
  const paidHint = params.get("paid") === "1";
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const pollStartedAt = usePollStart(id);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [receiveBusy, setReceiveBusy] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isError } = useQuery({
    queryKey: ["order", tenant, id, token],
    queryFn: () => storeApi.order(tenant, id!, token),
    enabled: !!id,
    refetchInterval: (q) => {
      const d = q.state.data;
      const status = String(d?.order?.status ?? "");
      if (status === "PAID" || status === "FULFILLED") return false;
      const awaiting =
        d?.awaitingFinikPayment === true ||
        (paidHint && status === "PENDING");
      if (!awaiting) return false;
      if (Date.now() - pollStartedAt > FINIK_POLL_MAX_MS) return false;
      return FINIK_POLL_MS;
    },
  });

  const { data: upsell } = useQuery({
    queryKey: ["upsell", tenant],
    queryFn: () => storeApi.upsellProducts(tenant),
    enabled: !!ctx.postCheckoutUpsell?.enabled,
  });

  if (isError) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-zinc-600">Invalid or missing access link.</p>
        <Link to={storeHref("/account", nav)} className="mt-4 inline-block font-medium text-[var(--store-primary)]">
          Look up your orders
        </Link>
      </div>
    );
  }

  if (!data) return <p className="text-zinc-500">Loading order…</p>;

  const order = data.order as {
    orderNumber: string;
    status: string;
    currency: string;
    subtotalAmount: number;
    shippingAmount: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentProvider?: string | null;
    paymentCaptureStatus?: string | null;
    buyerProtection?: boolean;
    buyerReceivedAt?: string | null;
    trackingNumber?: string | null;
    shippedAt?: string | null;
    fulfillmentMethod?: string | null;
    pickupReadyAt?: string | null;
    pickupWarehouse?: {
      name: string;
      address1: string | null;
      address2: string | null;
      city: string | null;
      postal: string | null;
      country: string | null;
      phone: string | null;
      pickupInstructions: string | null;
    } | null;
    fulfillmentShipments?: Array<{
      id: string;
      status: string;
      trackingNumber: string | null;
      shippedAt?: string | null;
      warehouse: { name: string } | null;
    }>;
    events?: Array<{
      id: string;
      type: string;
      body: string | null;
      createdAt: string;
    }>;
    items: { id: string; title: string; quantity: number; totalAmount: number; productId?: string | null }[];
    digitalDownloads: Array<{
      id: string;
      token: string;
      downloads: number;
      expiresAt: string | null;
      product: { digitalAsset: { fileName: string; downloadLimit: number } | null };
    }>;
  };

  const paid = order.status === "PAID" || order.status === "FULFILLED";
  const isPickup = (order.fulfillmentMethod ?? "SHIP").toUpperCase() === "PICKUP";
  const shipments = order.fulfillmentShipments ?? [];
  const awaitingFinik =
    !paid &&
    (data.awaitingFinikPayment === true ||
      (paidHint && order.status === "PENDING"));

  const invoiceHref =
    id && token
      ? `/api/store/orders/${id}/invoice?tenant=${encodeURIComponent(tenant)}&token=${encodeURIComponent(token)}`
      : null;

  const purchaseTracked = useRef(false);
  useEffect(() => {
    if (!paid || purchaseTracked.current || !id) return;
    purchaseTracked.current = true;
    trackPurchase({
      orderId: id,
      products: order.items
        .filter((i) => i.productId)
        .map((i) => ({
          id: i.productId!,
          title: i.title,
          quantity: i.quantity,
          priceAmount: Math.round(i.totalAmount / Math.max(1, i.quantity)),
        })),
      valueCents: order.totalAmount,
      currency: order.currency,
    });
  }, [paid, id, order]);

  async function reorder() {
    const lines = order.items.filter((i) => i.productId);
    if (!lines.length) {
      alert("No products available to reorder");
      return;
    }
    setReorderBusy(true);
    try {
      for (const line of lines) {
        await storeApi.addToCart(tenant, {
          productId: line.productId!,
          quantity: line.quantity,
        });
      }
      navigate(storeHref("/cart", nav));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not reorder");
    } finally {
      setReorderBusy(false);
    }
  }

  return (
    <>
      {ctx.addons?.includes("branded-tracking") ? (
        <div className="mb-6 flex items-center gap-3">
          {ctx.logoUrl ? (
            <img src={ctx.logoUrl} alt="" className="h-10 w-10 object-contain" />
          ) : null}
          <p className="text-lg font-semibold" style={{ color: ctx.primaryColor }}>
            {ctx.tenant.name}
          </p>
        </div>
      ) : null}
      <CheckoutSteps step={3} />
      {awaitingFinik ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-amber-900">
            Confirming your Finik payment…
          </p>
          <p className="mt-1 text-sm text-amber-800">
            This usually takes a few seconds. The page will update automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">Thank you for your order!</p>
          <p className="mt-1 text-emerald-700">
            {order.paymentCaptureStatus === "AUTHORIZED"
              ? "Your card is reserved. You are charged when the store ships."
              : "We've sent confirmation to your email."}
          </p>
        </div>
      )}
      <h1 className="mt-8 text-3xl font-bold">Order #{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-zinc-500 capitalize">{order.status.toLowerCase()}</p>
      {order.buyerProtection &&
      !order.buyerReceivedAt &&
      (order.status === "PAID" || order.status === "FULFILLED") ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Got the order? Confirming releases the seller&apos;s payout.</p>
          {receiveError ? <p className="mt-2 text-sm text-red-600">{receiveError}</p> : null}
          <button
            type="button"
            disabled={receiveBusy}
            className="store-btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => {
              setReceiveBusy(true);
              setReceiveError(null);
              void storeApi
                .confirmReceived(tenant, id!, token)
                .then(() => qc.invalidateQueries({ queryKey: ["order", tenant, id, token] }))
                .catch((err) =>
                  setReceiveError(err instanceof Error ? err.message : "Could not confirm")
                )
                .finally(() => setReceiveBusy(false));
            }}
          >
            {receiveBusy ? "Saving…" : "I received this"}
          </button>
        </div>
      ) : null}

      {(isPickup ||
        order.trackingNumber ||
        order.pickupReadyAt ||
        shipments.length > 0) && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {isPickup ? "Pickup" : "Shipping"}
          </h2>
          {isPickup ? (
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              {order.pickupReadyAt ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                  Ready for pickup
                  {order.pickupReadyAt
                    ? ` · ${new Date(order.pickupReadyAt).toLocaleString()}`
                    : ""}
                </p>
              ) : (
                <p className="text-zinc-500">
                  We&apos;ll notify you when your order is ready for pickup.
                </p>
              )}
              {order.pickupWarehouse ? (
                <div className="mt-2">
                  <p className="font-medium">{order.pickupWarehouse.name}</p>
                  <p className="text-zinc-600">
                    {[
                      order.pickupWarehouse.address1,
                      order.pickupWarehouse.address2,
                      [order.pickupWarehouse.city, order.pickupWarehouse.postal]
                        .filter(Boolean)
                        .join(" "),
                      order.pickupWarehouse.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.pickupWarehouse.phone ? (
                    <p className="text-zinc-500">{order.pickupWarehouse.phone}</p>
                  ) : null}
                  {order.pickupWarehouse.pickupInstructions ? (
                    <p className="mt-2 text-zinc-600">
                      {order.pickupWarehouse.pickupInstructions}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              {order.trackingNumber ? (
                <p>
                  <span className="text-zinc-500">Tracking: </span>
                  <a
                    href={trackingUrl(order.trackingNumber)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-medium text-[var(--store-primary)] underline"
                  >
                    {order.trackingNumber}
                  </a>
                  {order.shippedAt ? (
                    <span className="ml-2 text-zinc-400">
                      · shipped {new Date(order.shippedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-zinc-500">
                  Tracking will appear here once your order ships.
                </p>
              )}
              {shipments.length > 0 ? (
                <ul className="space-y-2 border-t border-zinc-100 pt-3">
                  {shipments.map((s) => (
                    <li key={s.id} className="flex flex-wrap justify-between gap-2">
                      <span className="text-zinc-700">
                        {s.warehouse?.name ?? "Shipment"}{" "}
                        <span className="text-xs uppercase text-zinc-400">
                          {s.status}
                        </span>
                      </span>
                      {s.trackingNumber ? (
                        <a
                          href={trackingUrl(s.trackingNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-[var(--store-primary)] underline"
                        >
                          {s.trackingNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">No tracking yet</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </section>
      )}

      {order.events && order.events.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Delivery updates</h2>
          <ol className="mt-4 space-y-3 border-l border-zinc-200 pl-4">
            {order.events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium text-zinc-800">
                  {event.body || event.type.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ul className="space-y-3 border-b border-zinc-100 pb-4">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between text-sm">
              <span className="text-zinc-700">
                {i.title} × {i.quantity}
              </span>
              <span className="font-medium">{formatMoney(i.totalAmount, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Subtotal</dt>
            <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
          </div>
          {order.discountAmount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount</dt>
              <dd>−{formatMoney(order.discountAmount, order.currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-zinc-500">Shipping</dt>
            <dd>{formatMoney(order.shippingAmount, order.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Tax</dt>
            <dd>{formatMoney(order.taxAmount, order.currency)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-bold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
          </div>
        </dl>
      </div>

      {paid && upsell?.products?.length ? (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {upsell.headline ?? "You might also like"}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {upsell.products.map((p) => (
              <li key={p.id}>
                <Link
                  to={storeHref(`/products/${p.slug}`, nav)}
                  className="block rounded-xl border border-zinc-100 p-4 hover:border-[var(--store-primary)]"
                >
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatMoney(p.priceAmount, p.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {paid && order.digitalDownloads.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="font-semibold text-violet-900">Your downloads</h2>
          <ul className="mt-4 space-y-3">
            {order.digitalDownloads.map((d) => (
              <li key={d.id}>
                <a
                  href={`/api/store/download/${d.token}?tenant=${tenant}`}
                  className="font-medium text-violet-700 hover:underline"
                >
                  ↓ {d.product.digitalAsset?.fileName ?? "Download file"}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link to={storeHref("/", nav)} className="store-btn-primary">
          Continue shopping
        </Link>
        <Link to={storeHref("/account", nav)} className="store-btn-secondary">
          My orders
        </Link>
        {invoiceHref ? (
          <a
            href={invoiceHref}
            target="_blank"
            rel="noreferrer"
            className="store-btn-secondary"
          >
            Download receipt (PDF)
          </a>
        ) : null}
        {paid ? (
          <button
            type="button"
            disabled={reorderBusy}
            onClick={() => void reorder()}
            className="store-btn-secondary disabled:opacity-50"
          >
            {reorderBusy ? "Adding…" : "Reorder"}
          </button>
        ) : null}
        {paid && token ? (
          <Link
            to={
              storeHref(`/orders/${id}/return`, nav) +
              `&token=${encodeURIComponent(token)}`
            }
            className="store-btn-secondary"
          >
            Request return/exchange
          </Link>
        ) : null}
      </div>
    </>
  );
}
