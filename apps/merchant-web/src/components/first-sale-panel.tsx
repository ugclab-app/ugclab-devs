import { formatMoney } from "@ugclab/i18n";
import { Link } from "react-router-dom";

export function FirstSalePanel({
  firstSale,
  currency,
}: {
  firstSale: {
    hasFirstSale: boolean;
    firstSaleAt: string | null;
    hoursToFirstSale: number | null;
    firstOrderNumber: string | null;
    firstOrderAmount: number | null;
  };
  currency: string;
}) {
  if (!firstSale.hasFirstSale) {
    return (
      <section className="admin-card border-amber-200 bg-amber-50/50 p-6">
        <h2 className="font-semibold text-zinc-900">First sale funnel</h2>
        <p className="mt-2 text-sm text-zinc-600">
          No paid orders yet. Complete onboarding and share your store link.
        </p>
        <Link
          to="/products/new"
          className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:underline"
        >
          Add a product →
        </Link>
      </section>
    );
  }

  return (
    <section className="admin-card p-6">
      <h2 className="font-semibold text-zinc-900">First sale</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-xs uppercase text-zinc-400">Time to first order</dt>
          <dd className="mt-1 text-xl font-bold text-emerald-700">
            {firstSale.hoursToFirstSale != null
              ? firstSale.hoursToFirstSale < 24
                ? `${firstSale.hoursToFirstSale}h`
                : `${Math.round(firstSale.hoursToFirstSale / 24)}d`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-400">First order</dt>
          <dd className="mt-1 font-semibold">#{firstSale.firstOrderNumber}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-400">Amount</dt>
          <dd className="mt-1 font-semibold">
            {firstSale.firstOrderAmount != null
              ? formatMoney(firstSale.firstOrderAmount, currency)
              : "—"}
          </dd>
        </div>
      </dl>
      {firstSale.firstSaleAt ? (
        <p className="mt-3 text-xs text-zinc-500">
          Paid at {new Date(firstSale.firstSaleAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
