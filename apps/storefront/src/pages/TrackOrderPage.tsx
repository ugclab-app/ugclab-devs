import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input } from "@ugclab/ui";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { useDocumentSeo } from "@/hooks/use-document-seo";

export function TrackOrderPage() {
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const navigate = useNavigate();
  const nav = { locale, tenant };
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useDocumentSeo({
    title: `${ctx.tenant.name} — Track order`,
    description: "Track your order with order number and email.",
    noindex: true,
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Track your order</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter the order number from your receipt and the email used at checkout. No account needed.
      </p>
      <form
        className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setPending(true);
          const fd = new FormData(e.currentTarget);
          void storeApi
            .trackOrder(tenant, String(fd.get("orderNumber")), String(fd.get("email")))
            .then((res) => {
              const q = new URLSearchParams({ tenant, locale });
              if (res.accessToken) q.set("token", res.accessToken);
              navigate(`/orders/${res.orderId}?${q.toString()}`);
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : "Order not found");
              setPending(false);
            });
        }}
      >
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Input name="orderNumber" label="Order number" required placeholder="1001" />
        <Input name="email" type="email" label="Email" required />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Looking up…" : "Track order"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link to={storeHref("/account", nav)} className="text-[var(--store-primary)] hover:underline">
          Or look up all orders by email
        </Link>
      </p>
    </div>
  );
}
