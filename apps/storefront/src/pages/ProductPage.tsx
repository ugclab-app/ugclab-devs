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
import { ProductRecommendations } from "@/components/product-recommendations";
import { WishlistButton } from "@/components/wishlist-button";
import { BoughtTogether } from "@/components/bought-together";
import { ProductJsonLd } from "@/components/store-json-ld";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import { QuantityOffers } from "@/components/quantity-offers";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { IconAccordionSection, PickupSection } from "@/components/sales-blocks";
import { DeliveryEtaBadge } from "@/components/delivery-eta-badge";
import { RecentPurchaseToast } from "@/components/recent-purchase-toast";
import { UgcPhotoGallery } from "@/components/ugc-photo-gallery";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
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
        quantityOffers?: unknown;
        payWhatYouWant?: boolean;
        minPriceAmount?: number | null;
        lessonCount?: number;
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
          {(product.lessonCount ?? 0) > 0 ? (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                Course · {product.lessonCount}{" "}
                {product.lessonCount === 1 ? "lesson" : "lessons"} · available in your
                Library after purchase
              </span>
            </div>
          ) : null}
          <DeliveryEtaBadge
            productType={product.type}
            locale={locale}
            className="mt-3"
          />
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
            reviewSummary={reviewSummary(data.reviews)}
            payWhatYouWant={product.payWhatYouWant === true}
            minPriceAmount={product.minPriceAmount ?? null}
          />
          <QuantityOfferBlock
            productId={product.id}
            offers={product.quantityOffers}
            variants={product.variants}
            currency={data.currency}
            locale={locale}
          />
          <ProductFacts
            sizeChart={product.sizeChart}
            shipping={ctx.settings?.shippingPolicy}
            blocks={(ctx.theme.productPageBlocks ?? []).filter(
              (b) => b.type === "icon_accordion" || b.type === "pickup"
            )}
          />
          <BoughtTogether productId={product.id} />
        </div>
      </div>
      {(ctx.theme.productPageBlocks?.length ?? 0) > 0 ? (
        <div className="mt-12">
          <StoreBlockRenderer
            blocks={ctx.theme.productPageBlocks!.filter(
              (b) =>
                b.type !== "sticky_cta" &&
                b.type !== "discount_popup" &&
                b.type !== "icon_accordion" &&
                b.type !== "pickup"
            )}
            theme={ctx.theme}
            pageContext="product"
          />
        </div>
      ) : null}
      <UgcPhotoGallery
        photos={ugcPhotosFromReviews(
          data.reviews as Array<{
            authorName?: string;
            photoUrls?: string[];
          }>
        )}
      />
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
      <ProductRecommendations slug={slug!} />
      <div className="mt-10">
        <StoreTrustStrip />
      </div>
      <RecentlyViewedSection excludeId={product.id} />
      {slug ? <RecentPurchaseToast productSlug={slug} /> : null}
    </>
  );
}

function ugcPhotosFromReviews(
  reviews: Array<{ authorName?: string; photoUrls?: string[] }>
): { url: string; author?: string | null }[] {
  const out: { url: string; author?: string | null }[] = [];
  const seen = new Set<string>();
  for (const r of reviews) {
    for (const url of r.photoUrls ?? []) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, author: r.authorName ?? null });
    }
  }
  return out;
}

function QuantityOfferBlock({
  productId,
  offers,
  variants,
  currency,
  locale,
}: {
  productId: string;
  offers: unknown;
  variants: { id: string; title: string }[];
  currency: string;
  locale: string;
}) {
  const rows = Array.isArray(offers)
    ? offers.flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const item = row as { qty?: number; label?: string; priceCents?: number };
        if (!item.qty || !item.priceCents) return [];
        return [{ qty: item.qty, label: item.label || `${item.qty}`, priceCents: item.priceCents }];
      })
    : [];
  if (!rows.length) return null;
  return (
    <div className="mt-6">
      <QuantityOffers
        productId={productId}
        offers={rows}
        variants={variants}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}

function reviewSummary(reviews: unknown): { average: number; count: number } | null {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const ratings = reviews
    .map((row) =>
      row && typeof row === "object" ? Number((row as { rating?: number }).rating) : NaN
    )
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ratings.length === 0) return null;
  const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
  return { average, count: ratings.length };
}

function ProductFacts({
  sizeChart,
  shipping,
  blocks,
}: {
  sizeChart?: string | null;
  shipping?: string | null;
  blocks: HomeBlock[];
}) {
  const facts: { question: string; answer: string }[] = [];
  if (sizeChart?.trim()) facts.push({ question: "Find your fit", answer: sizeChart.trim() });
  if (shipping?.trim()) facts.push({ question: "Shipping & returns", answer: shipping.trim() });
  return (
    <div className="mt-6 space-y-4">
      {facts.length > 0 ? (
        <IconAccordionSection block={{ id: "product-facts", type: "icon_accordion", faqItems: facts }} />
      ) : null}
      {blocks.map((block) =>
        block.type === "pickup" ? (
          <PickupSection key={block.id} block={block} />
        ) : (
          <IconAccordionSection key={block.id} block={block} />
        )
      )}
    </div>
  );
}
