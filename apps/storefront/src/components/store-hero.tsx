import { Link } from "react-router-dom";
import type { StoreTheme } from "@ugclab/tenant/store-theme";
import { storeHref } from "@/lib/store-href";

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
}: {
  storeName: string;
  description?: string | null;
  primaryColor: string;
  locale: string;
  tenantSlug: string;
  featuredCollections: Collection[];
  theme: StoreTheme;
  featuredCollection: Collection | null;
}) {
  const nav = { locale, tenant: tenantSlug };
  const title = theme.heroTitle?.trim() || storeName;
  const subtitle =
    theme.heroSubtitle?.trim() ||
    description ||
    "Curated digital goods and merch — instant delivery or worldwide shipping.";

  const chips = featuredCollection
    ? [featuredCollection]
    : featuredCollections.slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-2xl text-white shadow-lg">
      {theme.heroBannerUrl ? (
        <img
          src={theme.heroBannerUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        className="relative px-8 py-14 sm:px-12 sm:py-16"
        style={{
          background: theme.heroBannerUrl
            ? "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 100%)"
            : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 45%, #1e1b4b 100%)`,
        }}
      >
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">Welcome to</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-white/90">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {featuredCollection ? (
              <Link
                to={storeHref(`/collections/${featuredCollection.slug}`, nav)}
                className="store-btn-secondary"
              >
                Shop {featuredCollection.title}
              </Link>
            ) : (
              <Link to={storeHref("/collections", nav)} className="store-btn-secondary">
                Browse collections
              </Link>
            )}
            <a
              href="#products"
              className="rounded-lg bg-white/20 px-5 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/30"
            >
              Shop all
            </a>
          </div>
        </div>
        {chips.length > 0 ? (
          <div className="relative z-10 mt-10 flex flex-wrap gap-3 border-t border-white/20 pt-8">
            {chips.map((c) => (
              <Link
                key={c.slug}
                to={storeHref(`/collections/${c.slug}`, nav)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
              >
                {c.title} →
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {!theme.heroBannerUrl ? (
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: primaryColor }}
          aria-hidden
        />
      ) : null}
    </section>
  );
}
