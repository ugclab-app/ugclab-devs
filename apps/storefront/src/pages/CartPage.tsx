import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney, getMessages } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { productImageUrl } from "@/lib/product-images";
import { storeHref } from "@/lib/store-href";
import { CheckoutSteps } from "@/components/checkout-steps";
import { CartEmailCapture } from "@/components/cart-email-capture";
import { ExpressPayHint } from "@/components/express-pay-hint";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function CartPage() {
  const ctx = useStore();
  const sf = getMessages(ctx.locale).storefront;
  const { tenant } = useStoreParams();
  const qc = useQueryClient();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data } = useQuery({
    queryKey: ["cart", tenant],
    queryFn: () => storeApi.cart(tenant),
  });

  const update = useMutation({
    mutationFn: (body: { productId: string; variantId?: string; quantity: number }) =>
      storeApi.updateCart(tenant, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["store-context"] });
    },
  });

  const remove = useMutation({
    mutationFn: (body: { productId: string; variantId?: string }) =>
      storeApi.removeFromCart(tenant, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["store-context"] });
    },
  });

  const lines = data?.lines ?? [];
  const total = data?.total ?? 0;

  const suggestions = useQuery({
    queryKey: ["cart-suggestions", tenant, lines.map((l) => l.productId).join(",")],
    queryFn: () => storeApi.cartSuggestions(tenant),
    enabled: lines.length > 0,
  });

  const addSuggestion = useMutation({
    mutationFn: (productId: string) => storeApi.addToCart(tenant, { productId, quantity: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["store-context"] });
      qc.invalidateQueries({ queryKey: ["cart-suggestions"] });
    },
  });

  useDocumentSeo({
    title: buildStoreTitle(
      (ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name,
      sf.cart
    ),
    description: ctx.settings?.seoDescription ?? undefined,
    image: ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
  });

  return (
    <>
      <CheckoutSteps step={1} />
      <h1 className="text-3xl font-bold">{sf.cart}</h1>
      {lines.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-zinc-600">{sf.emptyCart}</p>
          <Link to={storeHref("/", nav)} className="store-btn-primary mt-6 inline-block">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {lines.map((line) => (
              <li
                key={`${line.productId}:${line.variantId ?? ""}`}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <Link to={storeHref(`/products/${line.slug}`, nav)} className="shrink-0">
                  {line.imageKey ? (
                    <img
                      src={productImageUrl(line.imageKey)}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-zinc-100 text-zinc-300">
                      ◇
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={storeHref(`/products/${line.slug}`, nav)}
                    className="font-semibold hover:text-[var(--store-primary)]"
                  >
                    {line.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatMoney(line.unit, ctx.currency)} each
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-zinc-500">Qty</label>
                    <input
                      type="number"
                      min={1}
                      defaultValue={line.quantity}
                      className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                      onBlur={(e) => {
                        const qty = parseInt(e.target.value, 10);
                        if (qty > 0 && qty !== line.quantity) {
                          update.mutate({
                            productId: line.productId,
                            variantId: line.variantId,
                            quantity: qty,
                          });
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-600 hover:underline"
                    onClick={() =>
                      remove.mutate({
                        productId: line.productId,
                        variantId: line.variantId,
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <span className="font-semibold">{formatMoney(line.lineTotal, ctx.currency)}</span>
              </li>
            ))}
          </ul>
          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <CartEmailCapture />
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold">Order summary</h2>
              <p className="mt-4 text-xl font-bold">{formatMoney(total, ctx.currency)}</p>
              <Link
                to={storeHref("/checkout", nav)}
                className="store-btn-primary mt-6 block w-full text-center"
              >
                {sf.checkout}
              </Link>
            </div>
            <ExpressPayHint
              stripeLive={ctx.payments?.stripeLive}
              linkEnabled={ctx.theme.stripeLinkEnabled !== false}
            />
            <StoreTrustStrip />
          </aside>
        </div>
      )}
      {(suggestions.data?.products.length ?? 0) > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Often bought together</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.data!.products.map((p) => (
              <li key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <Link to={storeHref(`/products/${p.slug}`, nav)} className="block">
                  {p.imageKey ? (
                    <img
                      src={productImageUrl(p.imageKey)}
                      alt=""
                      className="mb-3 h-36 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-36 items-center justify-center rounded-lg bg-zinc-100 text-zinc-300">
                      ◇
                    </div>
                  )}
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatMoney(p.priceAmount, p.currency)}
                  </p>
                </Link>
                <button
                  type="button"
                  disabled={addSuggestion.isPending}
                  onClick={() => addSuggestion.mutate(p.id)}
                  className="mt-3 w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Add to cart
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {(ctx.theme.cartBlocks?.length ?? 0) > 0 ? (
        <div className="mt-12">
          <StoreBlockRenderer
            blocks={ctx.theme.cartBlocks!}
            theme={ctx.theme}
            pageContext="page"
          />
        </div>
      ) : null}
    </>
  );
}
