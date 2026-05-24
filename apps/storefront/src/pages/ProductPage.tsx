import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, moneyLocaleFor } from "@ugclab/i18n";
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
import { ProductJsonLd } from "@/components/store-json-ld";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data, isLoading } = useQuery({
    queryKey: ["product", tenant, slug, locale],
    queryFn: () => storeApi.product(tenant, slug!, locale),
    enabled: !!slug,
  });

  useEffect(() => {
    const id = (data?.product as { id?: string } | undefined)?.id;
    if (id) trackRecentProduct(ctx.tenant.id, id);
  }, [data, ctx.tenant.id]);

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
        variants: { id: string; title: string; inventory: number | null }[];
        seoTitle?: string;
        seoDescription?: string | null;
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

  const priceLabel = formatMoney(
    product.priceAmount,
    data.currency,
    moneyLocaleFor(data.currency, locale)
  );
  const compareLabel =
    product.compareAt != null && product.compareAt > product.priceAmount
      ? formatMoney(product.compareAt, data.currency, moneyLocaleFor(data.currency, locale))
      : null;

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
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{priceLabel}</span>
            {compareLabel ? (
              <span className="text-lg text-zinc-400 line-through">{compareLabel}</span>
            ) : null}
          </div>
          {product.description ? (
            <div
              className="product-description prose prose-zinc mt-6 max-w-none text-zinc-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : null}
          <ProductPurchase
            productId={product.id}
            priceLabel={priceLabel}
            variants={product.variants}
            productInventory={product.inventory}
            type={product.type}
          />
        </div>
      </div>
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
      {(ctx.theme.productPageBlocks?.length ?? 0) > 0 ? (
        <div className="mt-12">
          <StoreBlockRenderer blocks={ctx.theme.productPageBlocks!} theme={ctx.theme} />
        </div>
      ) : null}
    </>
  );
}
