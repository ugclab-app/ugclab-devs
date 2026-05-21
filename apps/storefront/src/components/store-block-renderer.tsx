import type { ReactNode } from "react";
import type { HomeBlock, ScrollAnimation, StoreTheme } from "@ugclab/tenant/store-theme";
import { blockGapClass } from "@ugclab/tenant/store-theme";
import { useStore } from "@/context/store";
import { StoreHero } from "@/components/store-hero";
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

function TextBannerSection({ block }: { block: HomeBlock }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      {block.title ? <h2 className="text-2xl font-bold">{block.title}</h2> : null}
      {block.subtitle ? <p className="mt-2 text-zinc-600">{block.subtitle}</p> : null}
      {block.body ? <p className="mt-2 text-sm text-zinc-500">{block.body}</p> : null}
    </section>
  );
}

function FaqSection({ block }: { block: HomeBlock }) {
  const items = block.faqItems ?? [];
  if (items.length === 0) return null;
  return (
    <section>
      {block.title ? <h2 className="text-2xl font-bold">{block.title}</h2> : null}
      <dl className="mt-6 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
            <dt className="font-semibold">{item.question}</dt>
            <dd className="mt-1 text-sm text-zinc-600">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HtmlSection({ block }: { block: HomeBlock }) {
  if (!block.htmlContent?.trim()) return null;
  return (
    <section
      className="prose prose-zinc max-w-none"
      dangerouslySetInnerHTML={{ __html: block.htmlContent }}
    />
  );
}

function VideoSection({ block }: { block: HomeBlock }) {
  if (!block.videoUrl?.trim()) return null;
  const embed = block.videoUrl.includes("youtube")
    ? block.videoUrl.replace("watch?v=", "embed/").split("&")[0]
    : block.videoUrl;
  return (
    <section>
      {block.title ? <h2 className="mb-4 text-2xl font-bold">{block.title}</h2> : null}
      <div className="aspect-video overflow-hidden rounded-xl bg-zinc-100">
        <iframe src={embed} title={block.title ?? "Video"} className="h-full w-full" allowFullScreen />
      </div>
    </section>
  );
}

const CMS_BLOCK_TYPES = new Set<HomeBlock["type"]>([
  "hero",
  "text_banner",
  "image_text",
  "cta",
  "html",
  "video",
  "gallery",
  "features",
  "faq",
  "spacer",
  "divider",
  "columns",
  "newsletter",
  "countdown",
  "map",
  "logos",
  "pricing",
]);

export function StoreBlockRenderer({
  blocks,
  theme,
  scrollAnimation,
}: {
  blocks: HomeBlock[];
  theme: StoreTheme;
  scrollAnimation?: ScrollAnimation;
}) {
  const ctx = useStore();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const anim = scrollAnimation ?? theme.scrollAnimation ?? "none";
  const nodes: ReactNode[] = [];

  function emit(id: string, node: ReactNode) {
    nodes.push(
      anim === "none" ? (
        <div key={id}>{node}</div>
      ) : (
        <ScrollReveal key={id} animation={anim}>
          {node}
        </ScrollReveal>
      )
    );
  }

  for (const block of blocks) {
    if (!CMS_BLOCK_TYPES.has(block.type) || block.type === "discount_popup") continue;

    if (block.type === "hero") {
      const heroTheme = {
        ...theme,
        heroTitle: block.title ?? theme.heroTitle,
        heroSubtitle: block.subtitle ?? theme.heroSubtitle,
        heroBannerUrl: block.imageUrl ?? theme.heroBannerUrl,
        heroCollectionSlug: block.collectionSlug ?? theme.heroCollectionSlug,
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
    if (block.type === "text_banner") emit(block.id, <TextBannerSection block={block} />);
    if (block.type === "featured_collection") {
      /* collection blocks need ProductsSection — skip in CMS-only */
    }
    if (block.type === "faq") emit(block.id, <FaqSection block={block} />);
    if (block.type === "html") emit(block.id, <HtmlSection block={block} />);
    if (block.type === "video") emit(block.id, <VideoSection block={block} />);
    if (block.type === "cta") emit(block.id, <CtaBlockSection block={block} nav={nav} />);
    if (block.type === "image_text") emit(block.id, <ImageTextBlockSection block={block} nav={nav} />);
    if (block.type === "gallery") emit(block.id, <GalleryBlockSection block={block} />);
    if (block.type === "features") emit(block.id, <FeaturesBlockSection block={block} />);
    if (block.type === "spacer") emit(block.id, <SpacerBlockSection block={block} />);
    if (block.type === "divider") emit(block.id, <DividerBlockSection block={block} />);
    if (block.type === "columns") emit(block.id, <ColumnsBlockSection block={block} />);
    if (block.type === "newsletter") emit(block.id, <NewsletterBlockSection block={block} />);
    if (block.type === "countdown") emit(block.id, <CountdownBlockSection block={block} />);
    if (block.type === "map") emit(block.id, <MapBlockSection block={block} />);
    if (block.type === "logos") emit(block.id, <LogosBlockSection block={block} />);
    if (block.type === "pricing") emit(block.id, <PricingBlockSection block={block} nav={nav} />);
  }

  return (
    <div className={blockGapClass(theme.blockGap)}>{nodes}</div>
  );
}
