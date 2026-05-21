import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { AccountLookupForm } from "@/components/account-forms";

export function AccountPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const [params] = useSearchParams();
  const lookupEmail = params.get("email")?.trim().toLowerCase();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data: session } = useQuery({
    queryKey: ["account-session", tenant],
    queryFn: () => storeApi.accountSession(tenant),
  });

  const { data: lookup } = useQuery({
    queryKey: ["account-lookup", tenant, lookupEmail],
    queryFn: () => storeApi.accountLookup(tenant, lookupEmail!),
    enabled: !!lookupEmail && !session?.customer,
  });

  const customer = session?.customer;
  const orders = customer?.orders ?? lookup?.orders ?? [];

  return (
    <>
      <h1 className="text-3xl font-bold">My account</h1>
      {customer ? (
        <p className="mt-2 text-sm text-zinc-500">Signed in as {customer.email}</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          Guest checkout — look up by email or{" "}
          <Link to={storeHref("/account/login", nav)} className="font-medium text-[var(--store-primary)]">
            sign in
          </Link>
        </p>
      )}

      {!customer ? (
        ctx.checkoutGuestLookup ? (
          <div className="mt-8 space-y-4">
            <AccountLookupForm initialEmail={lookupEmail} />
            {lookupEmail && orders.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No orders found for <strong>{lookupEmail}</strong>.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Guest order lookup is disabled.{" "}
            <Link to={storeHref("/account/login", nav)} className="font-medium text-[var(--store-primary)]">
              Sign in
            </Link>{" "}
            to view your orders.
          </p>
        )
      ) : null}

      {orders.length === 0 && (customer || !lookupEmail) ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
          No orders yet.
        </p>
      ) : orders.length > 0 ? (
        <ul className="mt-8 divide-y overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {(orders as Array<{
            id: string;
            orderNumber: string;
            totalAmount: number;
            currency: string;
            createdAt: string;
            accessToken: string | null;
          }>).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-semibold">Order #{o.orderNumber}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatMoney(o.totalAmount, o.currency)}</p>
                {o.accessToken ? (
                  <Link
                    to={storeHref(`/orders/${o.id}`, nav) + `&token=${o.accessToken}`}
                    className="text-sm font-medium text-[var(--store-primary)]"
                  >
                    View →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
