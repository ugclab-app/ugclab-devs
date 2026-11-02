import { useQuery } from "@tanstack/react-query";
import { storeApi, type StoreListProduct } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { ProductCard } from "@/components/product-card";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";

export function ProductRecommendations({ slug }: { slug: string }) {
  const ctx = useStore();
  const { tenant, locale, search } = useStoreParams();
  const currency = search.get("currency") ?? undefined;
  const country = search.get("country") ?? undefined;

  const { data } = useQuery({
    queryKey: ["product-recommendations", tenant, slug, locale, currency, country],
    queryFn: () =>
      storeApi.getRecommendations(tenant, slug, { locale, currency, country, limit: "4" }),
    retry: false,
  });

  if (!data) return null;
  const displayCurrency = data.currency ?? ctx.currency;

  return (
    <>
      <RecommendationGrid
        title="You may also like"
        products={data.similar ?? []}
        currency={displayCurrency}
      />
      <RecommendationGrid
        title="Frequently bought together"
        products={data.boughtTogether ?? []}
        currency={displayCurrency}
      />
    </>
  );
}

function RecommendationGrid({
  title,
  products,
  currency,
}: {
  title: string;
  products: StoreListProduct[];
  currency: string;
}) {
  const ctx = useStore();
  const { locale } = useStoreParams();
  if (products.length === 0) return null;
  return (
    <section className="mt-12 border-t border-zinc-200 pt-10">
      <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            {...productCardProps(p, {
              currency,
              typeLabel: productTypeLabel(p.type, locale),
              locale: ctx.locale,
              tenantSlug: ctx.tenant.slug,
            })}
          />
        ))}
      </ul>
    </section>
  );
}
