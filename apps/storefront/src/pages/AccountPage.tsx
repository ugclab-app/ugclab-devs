import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { AccountLookupForm } from "@/components/account-forms";
import { AccountProfile } from "@/components/account-profile";

export function AccountPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lookupEmail = params.get("email")?.trim().toLowerCase();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const [reorderId, setReorderId] = useState<string | null>(null);
  const qc = useQueryClient();

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

  const { data: entitlementsData } = useQuery({
    queryKey: ["account-entitlements", tenant],
    queryFn: () => storeApi.accountEntitlements(tenant),
    enabled: !!customer,
  });
  const entitlements = entitlementsData?.entitlements ?? [];

  async function openSubscriptionPortal() {
    try {
      const { url } = await storeApi.subscriptionPortal(tenant);
      window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open portal");
    }
  }

  async function reorderFromAccount(orderId: string, accessToken: string | null) {
    setReorderId(orderId);
    try {
      const data = await storeApi.order(tenant, orderId, accessToken ?? undefined);
      const items = (data.order as { items?: { productId?: string | null; quantity: number }[] })
        .items ?? [];
      const lines = items.filter((i) => i.productId);
      if (!lines.length) {
        alert("No products available to reorder");
        return;
      }
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
      setReorderId(null);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold">My account</h1>
      {customer ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">Signed in as {customer.email}</p>
          <button
            type="button"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            onClick={async () => {
              await storeApi.accountLogout(tenant);
              qc.invalidateQueries({ queryKey: ["account-session", tenant] });
              qc.invalidateQueries({ queryKey: ["account-wishlist", tenant] });
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          Guest checkout — look up by email or{" "}
          <Link to={storeHref("/account/login", nav)} className="font-medium text-[var(--store-primary)]">
            sign in
          </Link>
        </p>
      )}

      {session?.b2b ? (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">B2B · {session.b2b.companyName}</p>
          <p className="mt-1 text-violet-800/90">
            {session.b2b.paymentTermsDays
              ? `Net ${session.b2b.paymentTermsDays} payment terms · `
              : null}
            Wholesale prices apply at checkout when you are signed in.
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-sm">
        <Link
          to={storeHref("/gift-card", nav)}
          className="font-medium text-[var(--store-primary)]"
        >
          Check gift card balance →
        </Link>
      </p>

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

      {customer ? (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Digital access</h2>
            <button
              type="button"
              onClick={() => void openSubscriptionPortal()}
              className="store-btn-secondary text-sm"
            >
              Manage subscriptions
            </button>
          </div>
          {entitlements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-500">
              No active entitlements.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {entitlements.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-semibold">
                      {e.product?.title ?? e.productId}
                    </p>
                    {e.expiresAt ? (
                      <p className="text-xs text-zinc-500">
                        Expires {new Date(e.expiresAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">Active</p>
                    )}
                  </div>
                  {e.product?.slug ? (
                    <Link
                      to={storeHref(`/products/${e.product.slug}`, nav)}
                      className="text-sm font-medium text-[var(--store-primary)]"
                    >
                      View →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {customer ? (
        <AccountProfile tenant={tenant} name={customer.name ?? null} email={customer.email} />
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
                <div className="mt-1 flex flex-wrap justify-end gap-3">
                  {o.accessToken ? (
                    <Link
                      to={storeHref(`/orders/${o.id}`, nav) + `&token=${o.accessToken}`}
                      className="text-sm font-medium text-[var(--store-primary)]"
                    >
                      View
                    </Link>
                  ) : null}
                  {o.accessToken ? (
                    <a
                      href={`/api/store/orders/${o.id}/invoice?tenant=${encodeURIComponent(tenant)}&token=${encodeURIComponent(o.accessToken)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                    >
                      Receipt
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={reorderId === o.id}
                    onClick={() => void reorderFromAccount(o.id, o.accessToken)}
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                  >
                    {reorderId === o.id ? "…" : "Reorder"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
