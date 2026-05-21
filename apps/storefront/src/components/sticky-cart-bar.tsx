import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

const HIDE_ON = ["/cart", "/checkout"];

export function StickyCartBar() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const location = useLocation();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const path = location.pathname.replace(/\/$/, "") || "/";
  if (ctx.theme.storeClosed || ctx.cartCount <= 0 || HIDE_ON.some((p) => path.endsWith(p))) {
    return null;
  }

  const { data } = useQuery({
    queryKey: ["cart", tenant],
    queryFn: () => storeApi.cart(tenant),
    staleTime: 30_000,
  });

  const totalLabel =
    data?.total != null ? formatMoney(data.total, data.currency ?? ctx.currency) : null;

  return (
    <div
      className="store-sticky-cart lg:hidden"
      role="region"
      aria-label="Cart summary"
    >
      <div className="store-sticky-cart-inner">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            {ctx.cartLabel}
            <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs text-white">
              {ctx.cartCount}
            </span>
          </p>
          {totalLabel ? (
            <p className="truncate text-xs text-zinc-500">{totalLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={storeHref("/cart", nav)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800"
          >
            Cart
          </Link>
          <Link
            to={storeHref("/checkout", nav)}
            className="store-btn-primary px-3 py-2 text-xs"
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
