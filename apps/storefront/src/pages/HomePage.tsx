import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMessages } from "@ugclab/i18n";
import {
  blockGapClass,
  resolveHomeBlocks,
  type FaqItem,
  type HomeBlock,
  type ScrollAnimation,
} from "@ugclab/tenant/store-theme";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { StoreHero } from "@/components/store-hero";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { ProductCard } from "@/components/product-card";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import {
  ColumnsBlockSection,
  CountdownBlockSection,
  CtaBlockSection,
  DividerBlockSection,
  FeaturesBlockSection,
  GalleryBlockSection,
  ImageTextBlockSection,
  LogosBlockSection,
  MapBlockSection,
  NewsletterBlockSection,
  PricingBlockSection,
  SpacerBlockSection,
} from "@/components/home-extra-blocks";
import { ScrollReveal } from "@/components/scroll-reveal";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

function ProductsSection({
  tenant,
  locale,
  q,
  sort,
  type,
  tag,
  title = "All products",
}: {
  tenant: string;
  locale: string;
  q?: string;
  sort?: string;
  type?: string;
  tag?: string;
  title?: string;
}) {
  const ctx = useStore();
  const { data } = useQuery({
    queryKey: ["products", tenant, locale, q, sort, type, tag],
    queryFn: () => storeApi.products(tenant, { locale, q, sort, type, tag }),
  });

  const sf = getMessages().storefront;
  const products = data?.products ?? [];

  return (
    <section id="products">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            {q ? `Results for “${q}”` : title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <CatalogToolbar locale={locale} tenantSlug={tenant} tags={data?.tags ?? []} />
      {products.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
          No products match your filters.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              {...productCardProps(p, {
                currency: data?.currency ?? ctx.currency,
                typeLabel: productTypeLabel(p.type),
                locale: ctx.locale,
                tenantSlug: ctx.tenant.slug,
              })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FeaturedSection({
  tenant,
  locale,
  featured,
  title,
}: {
  tenant: string;
  locale: string;
  featured: "new_arrivals" | "sale";
  title: string;
}) {
  const ctx = useStore();
  const { data } = useQuery({
    queryKey: ["products", tenant, locale, featured],
    queryFn: () => storeApi.products(tenant, { locale, featured }),
  });

  const sf = getMessages().storefront;
  const products = data?.products ?? [];
  if (products.length === 0) return null;

  return (
    <section id={featured}>
      <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            {...productCardProps(p, {
              currency: data?.currency ?? ctx.currency,
              typeLabel: productTypeLabel(p.type),
              locale: ctx.locale,
              tenantSlug: ctx.tenant.slug,
            })}
          />
        ))}
      </ul>
    </section>
  );
}

function CollectionSection({
  tenant,
  locale,
  block,
}: {
  tenant: string;
  locale: string;
  block: HomeBlock;
}) {
  const ctx = useStore();
  const slug = block.collectionSlug;
  const { data } = useQuery({
    queryKey: ["collection", tenant, slug, locale],
    queryFn: () => storeApi.collection(tenant, slug!, locale),
    enabled: !!slug,
  });
  if (!slug || !data?.products.length) return null;
  const sf = getMessages().storefront;

  return (
    <section>
      <h2 className="text-2xl font-bold text-zinc-900">
        {block.title ?? data.collection.title}
      </h2>
      {block.subtitle ? <p className="mt-1 text-sm text-zinc-500">{block.subtitle}</p> : null}
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.products.slice(0, 8).map((p) => (
          <ProductCard
            key={p.id}
            {...productCardProps(p, {
              currency: data.currency ?? ctx.currency,
              typeLabel: productTypeLabel(p.type),
              locale: ctx.locale,
              tenantSlug: ctx.tenant.slug,
            })}
          />
        ))}
      </ul>
    </section>
  );
}

function FaqSection({ block }: { block: HomeBlock }) {
  const items: FaqItem[] =
    block.faqItems ??
    (() => {
      try {
        const parsed = JSON.parse(block.body ?? "[]") as FaqItem[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8">
      {block.title ? <h2 className="text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
      <dl className="mt-6 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="border-b border-zinc-100 pb-4 last:border-0">
            <dt className="font-medium text-zinc-900">{item.question}</dt>
            <dd className="mt-1 text-sm text-zinc-600">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HtmlSection({ block }: { block: HomeBlock }) {
  const html = block.htmlContent ?? block.body;
  if (!html?.trim()) return null;
  return (
    <section className="prose prose-zinc max-w-none rounded-2xl border border-zinc-200 bg-white p-8">
      {block.title ? <h2 className="text-2xl font-bold text-zinc-900 not-prose">{block.title}</h2> : null}
      <div
        className={block.title ? "mt-4" : ""}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

function VideoSection({ block }: { block: HomeBlock }) {
  const url = block.videoUrl ?? block.imageUrl;
  if (!url?.trim()) return null;
  const embed = url.includes("youtube.com") || url.includes("youtu.be")
    ? url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
    : url;
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
      {block.title ? (
        <p className="bg-white px-6 py-3 font-semibold text-zinc-900">{block.title}</p>
      ) : null}
      <div className="aspect-video w-full">
        <iframe
          src={embed}
          title={block.title ?? "Video"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function StoreReviewsSection({ tenant, title }: { tenant: string; title?: string }) {
  const { data } = useQuery({
    queryKey: ["store-reviews", tenant],
    queryFn: () => storeApi.storeReviews(tenant, 6),
  });
  const reviews = data?.reviews ?? [];
  if (reviews.length === 0) return null;
  return (
    <section>
      <h2 className="text-2xl font-bold text-zinc-900">{title ?? "What customers say"}</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="font-medium text-zinc-900">{r.authorName}</p>
            <p className="text-amber-500 text-sm" aria-label={`${r.rating} stars`}>
              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
            </p>
            {r.body ? <p className="mt-2 text-sm text-zinc-600">{r.body}</p> : null}
            {r.product ? (
              <p className="mt-2 text-xs text-zinc-400">— {r.product.title}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TextBannerSection({ block }: { block: HomeBlock }) {
  const ctx = useStore();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        {block.imageUrl ? (
          <img src={block.imageUrl} alt="" className="h-full max-h-64 w-full object-cover" />
        ) : null}
        <div className="p-8">
          {block.title ? <h2 className="text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
          {block.subtitle ? <p className="mt-2 text-zinc-600">{block.subtitle}</p> : null}
          {block.body ? <p className="mt-3 text-sm text-zinc-500">{block.body}</p> : null}
          {block.ctaLabel && block.ctaPath ? (
            <Link
              to={storeHref(block.ctaPath, nav)}
              className="store-btn-primary mt-6 inline-block px-6 py-2.5 text-sm"
            >
              {block.ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const [params] = useSearchParams();
  const q = params.get("q") ?? undefined;
  const sort = params.get("sort") ?? undefined;
  const type = params.get("type") ?? undefined;
  const tag = params.get("tag") ?? undefined;

  const filtered = Boolean(q || tag || type);

  useDocumentSeo({
    title: (ctx.settings?.seoTitle as string | undefined) || buildStoreTitle(ctx.tenant.name),
    description: ctx.settings?.seoDescription ?? undefined,
    image: ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
  });

  let homeBlocks = resolveHomeBlocks(ctx.theme);
  if (ctx.theme.storeClosed) {
    const landingOnly = new Set<HomeBlock["type"]>([
      "hero",
      "text_banner",
      "html",
      "video",
      "faq",
      "cta",
      "image_text",
      "gallery",
      "features",
      "spacer",
      "divider",
      "columns",
      "newsletter",
      "countdown",
      "map",
      "logos",
      "pricing",
    ]);
    homeBlocks = homeBlocks.filter((b) => landingOnly.has(b.type));
  }

  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const scrollAnim: ScrollAnimation = ctx.theme.scrollAnimation ?? "none";
  const blocks: ReactNode[] = [];

  function emit(id: string, node: ReactNode) {
    blocks.push(
      scrollAnim === "none" ? (
        <div key={id}>{node}</div>
      ) : (
        <ScrollReveal key={id} animation={scrollAnim}>
          {node}
        </ScrollReveal>
      )
    );
  }

  for (const block of homeBlocks) {
    if (block.type === "discount_popup") continue;
    if (filtered && block.type !== "products") continue;

    if (block.type === "hero") {
      const heroTheme = {
        ...ctx.theme,
        heroTitle: block.title ?? ctx.theme.heroTitle,
        heroSubtitle: block.subtitle ?? ctx.theme.heroSubtitle,
        heroBannerUrl: block.imageUrl ?? ctx.theme.heroBannerUrl,
        heroCollectionSlug: block.collectionSlug ?? ctx.theme.heroCollectionSlug,
      };
      const featuredCollection = block.collectionSlug
        ? ctx.collections.find((c) => c.slug === block.collectionSlug) ?? null
        : ctx.featuredCollection;
      emit(
        block.id,
        <StoreHero
          storeName={ctx.tenant.name}
          description={ctx.settings?.seoDescription}
          primaryColor={ctx.primaryColor}
          locale={ctx.locale}
          tenantSlug={ctx.tenant.slug}
          featuredCollections={ctx.collections}
          theme={heroTheme}
          featuredCollection={featuredCollection}
        />
      );
    }
    if (block.type === "products") {
      emit(
        block.id,
        <ProductsSection
          tenant={tenant}
          locale={locale}
          q={q}
          sort={sort}
          type={type}
          tag={tag}
        />
      );
    }
    if (block.type === "new_arrivals") {
      emit(
        block.id,
        <FeaturedSection
          tenant={tenant}
          locale={locale}
          featured="new_arrivals"
          title={block.title ?? "New arrivals"}
        />
      );
    }
    if (block.type === "sale") {
      emit(
        block.id,
        <FeaturedSection
          tenant={tenant}
          locale={locale}
          featured="sale"
          title={block.title ?? "Sale"}
        />
      );
    }
    if (block.type === "text_banner") emit(block.id, <TextBannerSection block={block} />);
    if (block.type === "featured_collection") {
      emit(block.id, <CollectionSection tenant={tenant} locale={locale} block={block} />);
    }
    if (block.type === "faq") emit(block.id, <FaqSection block={block} />);
    if (block.type === "html") emit(block.id, <HtmlSection block={block} />);
    if (block.type === "video") emit(block.id, <VideoSection block={block} />);
    if (block.type === "reviews") {
      emit(block.id, <StoreReviewsSection tenant={tenant} title={block.title} />);
    }
    if (block.type === "cta") emit(block.id, <CtaBlockSection block={block} nav={nav} />);
    if (block.type === "image_text") {
      emit(block.id, <ImageTextBlockSection block={block} nav={nav} />);
    }
    if (block.type === "gallery") emit(block.id, <GalleryBlockSection block={block} />);
    if (block.type === "features") emit(block.id, <FeaturesBlockSection block={block} />);
    if (block.type === "spacer") emit(block.id, <SpacerBlockSection block={block} />);
    if (block.type === "divider") emit(block.id, <DividerBlockSection block={block} />);
    if (block.type === "columns") emit(block.id, <ColumnsBlockSection block={block} />);
    if (block.type === "newsletter") emit(block.id, <NewsletterBlockSection block={block} />);
    if (block.type === "countdown") emit(block.id, <CountdownBlockSection block={block} />);
    if (block.type === "map") emit(block.id, <MapBlockSection block={block} />);
    if (block.type === "logos") emit(block.id, <LogosBlockSection block={block} />);
    if (block.type === "pricing") {
      emit(block.id, <PricingBlockSection block={block} nav={nav} />);
    }
  }

  const pageStyle: CSSProperties = {
    backgroundColor: ctx.theme.pageBgColor,
    backgroundImage: ctx.theme.pageBgImage ? `url(${ctx.theme.pageBgImage})` : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "scroll",
  };

  return (
    <div className={blockGapClass(ctx.theme.blockGap)} style={pageStyle}>
      {ctx.theme.storeClosed ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          {ctx.theme.storeClosedMessage?.trim() || "Store opening soon — browse our story below."}
        </p>
      ) : null}
      {blocks}
      {!filtered && !ctx.theme.storeClosed ? <RecentlyViewedSection /> : null}
    </div>
  );
}
