import { Link } from "react-router-dom";
import type { HomeBlock, StoreTheme } from "@ugclab/tenant/store-theme";
import { useStorefrontMessages } from "@/hooks/use-storefront-messages";
import { storeHref } from "@/lib/store-href";
import { isLightColor } from "@/lib/color-contrast";

type Collection = { title: string; slug: string; description?: string | null };

export function StoreHero({
  storeName,
  description,
  primaryColor,
  locale,
  tenantSlug,
  featuredCollections,
  theme,
  featuredCollection,
  block,
}: {
  storeName: string;
  description?: string | null;
  primaryColor: string;
  locale: string;
  tenantSlug: string;
  featuredCollections: Collection[];
  theme: StoreTheme;
  featuredCollection: Collection | null;
  block?: HomeBlock;
}) {
  const sf = useStorefrontMessages();
  const nav = { locale, tenant: tenantSlug };
  const title = block?.title?.trim() || theme.heroTitle?.trim() || storeName;
  const subtitle =
    block?.subtitle?.trim() ||
    theme.heroSubtitle?.trim() ||
    description ||
    sf.hero.defaultSubtitle;

  const ctaLabel = block?.ctaLabel?.trim();
  const ctaPath = block?.ctaPath?.trim();
  const bannerUrl = (block?.imageUrl || theme.heroBannerUrl || "").trim() || undefined;
  const hasImage = Boolean(bannerUrl);

  const rawBg = block?.bgColor?.trim();
  // Pale/white hero bg + white type was unreadable — use brand gradient unless a dark solid is set.
  const solidDark = Boolean(rawBg && !isLightColor(rawBg));
  const background = hasImage
    ? "linear-gradient(135deg, rgba(15,23,42,0.62) 0%, rgba(15,23,42,0.35) 100%)"
    : solidDark
      ? rawBg!
      : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 42%, #1e1b4b 100%)`;

  const showChips =
    !ctaLabel && !featuredCollection && featuredCollections.length >= 2;
  const chips = showChips ? featuredCollections.slice(0, 3) : [];

  return (
    <section className="relative overflow-hidden text-white">
      {hasImage ? (
        <img
          src={bannerUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        className="relative px-6 py-16 sm:px-10 sm:py-20 lg:px-12"
        style={{ background }}
      >
        <div
          className={`relative z-10 mx-auto max-w-3xl ${
            block?.align === "center" ? "text-center" : ""
          }`}
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">
            {sf.hero.welcomeTo}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-white/90">{subtitle}</p>
          <div
            className={`mt-8 flex flex-wrap gap-3 ${
              block?.align === "center" ? "justify-center" : ""
            }`}
          >
            {ctaLabel && ctaPath ? (
              <Link to={storeHref(ctaPath, nav)} className="store-btn-secondary">
                {ctaLabel}
              </Link>
            ) : featuredCollection ? (
              <Link
                to={storeHref(`/collections/${featuredCollection.slug}`, nav)}
                className="store-btn-secondary"
              >
                {sf.hero.shopCollection.replace("{{name}}", featuredCollection.title)}
              </Link>
            ) : (
              <Link to={storeHref("/collections", nav)} className="store-btn-secondary">
                {sf.hero.browseCollections}
              </Link>
            )}
            <a
              href="#products"
              className="rounded-lg border border-white/40 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/25"
            >
              {sf.hero.shopAll}
            </a>
          </div>
        </div>
        {chips.length > 0 ? (
          <div
            className={`relative z-10 mx-auto mt-10 flex max-w-3xl flex-wrap gap-3 border-t border-white/20 pt-8 ${
              block?.align === "center" ? "justify-center" : ""
            }`}
          >
            {chips.map((c) => (
              <Link
                key={c.slug}
                to={storeHref(`/collections/${c.slug}`, nav)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
              >
                {c.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
