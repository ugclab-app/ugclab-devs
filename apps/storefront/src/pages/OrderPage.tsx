import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { CheckoutSteps } from "@/components/checkout-steps";

export function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get("token") ?? undefined;
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data, isError } = useQuery({
    queryKey: ["order", tenant, id, token],
    queryFn: () => storeApi.order(tenant, id!, token),
    enabled: !!id,
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
    items: { id: string; title: string; quantity: number; totalAmount: number }[];
    digitalDownloads: Array<{
      id: string;
      token: string;
      downloads: number;
      expiresAt: string | null;
      product: { digitalAsset: { fileName: string; downloadLimit: number } | null };
    }>;
  };

  const paid = order.status === "PAID" || order.status === "FULFILLED";

  return (
    <>
      <CheckoutSteps step={3} />
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
        <p className="text-sm font-semibold text-emerald-800">Thank you for your order!</p>
        <p className="mt-1 text-emerald-700">We&apos;ve sent confirmation to your email.</p>
      </div>
      <h1 className="mt-8 text-3xl font-bold">Order #{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-zinc-500 capitalize">{order.status.toLowerCase()}</p>

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
      </div>
    </>
  );
}
