import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { trackRecentProduct } from "@/hooks/use-recently-viewed";
import { productImageUrl } from "@/lib/product-images";
import { storeHref } from "@/lib/store-href";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductReviews } from "@/components/product-reviews";
import { ProductQuestions } from "@/components/product-questions";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import { WishlistButton } from "@/components/wishlist-button";
import { SizeChart } from "@/components/size-chart";
import { BoughtTogether } from "@/components/bought-together";
import { ProductJsonLd } from "@/components/store-json-ld";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const ctx = useStore();
  const { tenant, locale, search } = useStoreParams();
  const currency = search.get("currency") ?? undefined;
  const country = search.get("country") ?? undefined;
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data, isLoading } = useQuery({
    queryKey: ["product", tenant, slug, locale, currency, country],
    queryFn: () => storeApi.product(tenant, slug!, locale, currency, country),
    enabled: !!slug,
  });

  useEffect(() => {
    const id = (data?.product as { id?: string } | undefined)?.id;
    if (id) trackRecentProduct(ctx.tenant.id, id);
  }, [data, ctx.tenant.id]);

  useEffect(() => {
    const p = data?.product as
      | { id: string; title: string; priceAmount: number; currency?: string }
      | undefined;
    if (!p?.id) return;
    void import("@/lib/pixel-track").then(({ trackViewContent }) =>
      trackViewContent({
        id: p.id,
        title: p.title,
        priceAmount: p.priceAmount,
        currency: p.currency ?? ctx.currency,
      })
    );
  }, [data, ctx.currency]);

  const product = data?.product as
    | {
        id: string;
        title: string;
        description: string | null;
        type: string;
        priceAmount: number;
        compareAt: number | null;
        inventory: number | null;
        images: { storageKey: string; alt: string | null }[];
        variants: {
          id: string;
          title: string;
          inventory: number | null;
          priceAmount?: number;
        }[];
        sizeChart?: string | null;
        seoTitle?: string;
        seoDescription?: string | null;
        preorderEnabled?: boolean;
        tryBeforeYouBuyEnabled?: boolean;
        tryBeforeYouBuyDays?: number | null;
        subscriptionEnabled?: boolean;
        subscriptionInterval?: string | null;
        metafields?: {
          namespace: string;
          key: string;
          type: string;
          value: string;
        }[];
      }
    | undefined;

  const images =
    product?.images.map((img) => ({
      url: productImageUrl(img.storageKey),
      alt: img.alt ?? product?.title ?? "",
    })) ?? [];

  const metaDesc =
    product?.seoDescription ??
    (product?.description
      ? product.description.replace(/<[^>]+>/g, "").slice(0, 160)
      : undefined) ??
    ctx.settings?.seoDescription ??
    undefined;

  useDocumentSeo({
    title: buildStoreTitle(
      product?.seoTitle ??
        ((ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name),
      product?.title
    ),
    description: metaDesc,
    image: images[0]?.url ?? ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
    type: "product",
  });

  if (isLoading || !data || !product) {
    return <p className="text-zinc-500">Loading product…</p>;
  }

  const inStock =
    product.type !== "PHYSICAL" ||
    product.inventory == null ||
    product.inventory > 0;

  return (
    <>
      <ProductJsonLd
        name={product.title}
        description={product.description}
        imageUrls={images.map((i) => i.url)}
        priceAmount={product.priceAmount}
        currency={data.currency}
        slug={slug!}
        inStock={inStock}
      />
      <Breadcrumbs
        items={[
          { label: ctx.tenant.name, href: storeHref("/", nav) },
          { label: "Shop", href: storeHref("/", nav) },
          { label: product.title },
        ]}
      />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} />
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
            <WishlistButton productId={product.id} title={product.title} />
          </div>
          {(product.preorderEnabled ||
            product.subscriptionEnabled ||
            product.tryBeforeYouBuyEnabled) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.preorderEnabled ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Pre-order
                </span>
              ) : null}
              {product.subscriptionEnabled ? (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                  Subscribe
                  {product.subscriptionInterval
                    ? ` · ${product.subscriptionInterval}`
                    : ""}
                </span>
              ) : null}
              {product.tryBeforeYouBuyEnabled ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Try before you buy
                  {product.tryBeforeYouBuyDays
                    ? ` · ${product.tryBeforeYouBuyDays} days`
                    : ""}
                </span>
              ) : null}
            </div>
          )}
          {product.description ? (
            <div
              className="product-description prose prose-zinc mt-6 max-w-none text-zinc-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : null}
          {product.metafields && product.metafields.length > 0 ? (
            <dl className="mt-6 space-y-2 rounded-xl border border-zinc-100 p-4 text-sm">
              {product.metafields.map((m) => (
                <div
                  key={`${m.namespace}.${m.key}`}
                  className="flex justify-between gap-4"
                >
                  <dt className="text-zinc-500">
                    {m.namespace}.{m.key}
                  </dt>
                  <dd className="text-right font-medium text-zinc-800">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <ProductPurchase
            productId={product.id}
            productTitle={product.title}
            priceAmount={product.priceAmount}
            currency={data.currency}
            locale={locale}
            variants={product.variants}
            productInventory={product.inventory}
            type={product.type}
            subscriptionEnabled={product.subscriptionEnabled}
            subscriptionInterval={product.subscriptionInterval}
          />
          {product.sizeChart ? <SizeChart text={product.sizeChart} /> : null}
          <BoughtTogether productId={product.id} />
        </div>
      </div>
      {(ctx.theme.productPageBlocks?.length ?? 0) > 0 ? (
        <div className="mt-12">
          <StoreBlockRenderer
            blocks={ctx.theme.productPageBlocks!.filter(
              (b) => b.type !== "sticky_cta" && b.type !== "discount_popup"
            )}
            theme={ctx.theme}
            pageContext="product"
          />
        </div>
      ) : null}
      <ProductReviews productId={product.id} reviews={data.reviews} />
      <ProductQuestions
        productId={product.id}
        questions={(data.questions ?? []) as {
          id: string;
          authorName: string;
          question: string;
          answer: string | null;
          answeredAt: string | null;
          createdAt: string;
        }[]}
      />
      <div className="mt-10">
        <StoreTrustStrip />
      </div>
      <RecentlyViewedSection excludeId={product.id} />
    </>
  );
}
