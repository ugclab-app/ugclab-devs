import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckoutSteps } from "@/components/checkout-steps";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function CheckoutPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const settings = ctx.settings;

  const { data } = useQuery({
    queryKey: ["cart", tenant],
    queryFn: () => storeApi.cart(tenant),
  });

  const lines = data?.lines ?? [];
  const subtotal = data?.total ?? 0;
  const taxRateBps = settings?.taxRateBps ?? 0;

  useDocumentSeo({
    title: buildStoreTitle(
      (settings?.seoTitle as string | undefined) || ctx.tenant.name,
      "Checkout"
    ),
    description: settings?.seoDescription ?? undefined,
    image: settings?.seoOgImageUrl ?? ctx.logoUrl,
  });

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p>Your cart is empty.</p>
        <Link to={storeHref("/cart", nav)} className="store-btn-primary mt-6 inline-block">
          View cart
        </Link>
      </div>
    );
  }

  const showPolicies = !!(
    settings?.privacyUrl ||
    settings?.refundUrl ||
    settings?.privacyPolicy ||
    settings?.refundPolicy
  );

  return (
    <>
      <CheckoutSteps step={2} />
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-zinc-500">{ctx.tenant.name}</p>
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <CheckoutForm
              subtotalAmount={subtotal}
              showPolicies={showPolicies}
              privacyHref={
                settings?.privacyPolicy
                  ? storeHref("/policies/privacy", nav)
                  : settings?.privacyUrl ?? undefined
              }
              refundHref={
                settings?.refundPolicy
                  ? storeHref("/policies/refund", nav)
                  : settings?.refundUrl ?? undefined
              }
            />
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-semibold">Your order</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.title} className="flex justify-between gap-4">
                <span className="text-zinc-600">
                  {line.title} × {line.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  {formatMoney(line.lineTotal, ctx.currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, ctx.currency)}</span>
          </p>
          {taxRateBps > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Tax ({(taxRateBps / 100).toFixed(1)}%) calculated on submit
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
