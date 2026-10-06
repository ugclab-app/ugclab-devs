import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { ProductCard } from "@/components/product-card";
import { CatalogControls, CatalogPagination } from "@/components/catalog-controls";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function SearchPage() {
  const ctx = useStore();
  const { tenant, locale, search } = useStoreParams();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const currency = search.get("currency") ?? undefined;
  const country = search.get("country") ?? undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["search", tenant, locale, currency, params.toString()],
    queryFn: () =>
      storeApi.products(tenant, {
        locale,
        currency,
        country,
        q,
        sort: params.get("sort") ?? undefined,
        type: params.get("type") ?? undefined,
        tag: params.get("tag") ?? undefined,
        min: params.get("min") ?? undefined,
        max: params.get("max") ?? undefined,
        inStock: params.get("inStock") ?? undefined,
        page: params.get("page") ?? "1",
        pageSize: "12",
      }),
  });

  useDocumentSeo({
    title: buildStoreTitle(
      (ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name,
      q ? `Search: ${q}` : "Search"
    ),
    description: ctx.settings?.seoDescription ?? undefined,
    image: ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
  });

  return (
    <>
      <h1 className="text-3xl font-bold">{q ? `Results for “${q}”` : "Search"}</h1>
      <CatalogControls showQuery />
      {isLoading ? (
        <p className="mt-8 text-zinc-500">Searching…</p>
      ) : (data?.products.length ?? 0) === 0 ? (
        <p className="mt-10 text-zinc-500">No products matched.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data!.products.map((p) => (
            <ProductCard
              key={p.id}
              {...productCardProps(p, {
                currency: data!.currency,
                typeLabel: productTypeLabel(p.type, locale),
                locale: ctx.locale,
                tenantSlug: ctx.tenant.slug,
              })}
            />
          ))}
        </ul>
      )}
      <CatalogPagination
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 12}
        total={data?.total ?? 0}
      />
    </>
  );
}
