import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";
import { ProductCard } from "@/components/product-card";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { CatalogControls, CatalogPagination } from "@/components/catalog-controls";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const ctx = useStore();
  const { tenant, locale, search } = useStoreParams();
  const [params] = useSearchParams();
  const currency = search.get("currency") ?? undefined;
  const country = search.get("country") ?? undefined;

  const { data } = useQuery({
    queryKey: ["collection", tenant, slug, locale, currency, params.toString()],
    queryFn: () =>
      storeApi.collection(tenant, slug!, {
        locale,
        currency,
        country,
        sort: params.get("sort") ?? undefined,
        min: params.get("min") ?? undefined,
        max: params.get("max") ?? undefined,
        inStock: params.get("inStock") ?? undefined,
        page: params.get("page") ?? "1",
        pageSize: "12",
      }),
    enabled: !!slug,
  });

  const storeName =
    (ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name;
  useDocumentSeo({
    title: data?.collection.seoTitle
      ? data.collection.seoTitle
      : buildStoreTitle(storeName, data?.collection.title),
    description:
      data?.collection.seoDescription ??
      data?.collection.description ??
      (ctx.settings?.seoDescription as string | undefined) ??
      undefined,
    image: ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
  });
  if (!data) return <p className="text-zinc-500">Loading…</p>;

  const hero = data.hero;
  const bySlug = ctx.theme.collectionPageBlocks ?? {};
  const extraBlocks =
    bySlug[slug ?? ""] ?? bySlug["_default"] ?? bySlug["default"] ?? [];

  return (
    <>
      {hero ? (
        <div className="mb-10">
          <StoreBlockRenderer blocks={[hero]} theme={ctx.theme} />
        </div>
      ) : null}
      <h1 className="text-3xl font-bold">{data.collection.title}</h1>
      {data.collection.description ? (
        <p className="mt-2 text-zinc-600">{data.collection.description}</p>
      ) : null}
      <CatalogControls featuredSort />
      {data.products.length === 0 ? (
        <p className="mt-10 text-zinc-500">No products in this collection.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard
              key={p.id}
              {...productCardProps(p, {
                currency: data.currency,
                typeLabel: productTypeLabel(p.type, locale),
                locale: ctx.locale,
                tenantSlug: ctx.tenant.slug,
              })}
            />
          ))}
        </ul>
      )}
      <CatalogPagination
        page={data.page ?? 1}
        pageSize={data.pageSize ?? 12}
        total={data.total ?? data.products.length}
      />
      {extraBlocks.length > 0 ? (
        <div className="mt-12">
          <StoreBlockRenderer blocks={extraBlocks} theme={ctx.theme} />
        </div>
      ) : null}
    </>
  );
}
