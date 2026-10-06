import { useState } from "react";
import { api } from "@/api/client";
import {
  filterStoreThemes,
  listAllThemePresets,
  resolveThemeLayoutPreview,
  type StoreThemeCategory,
  type StoreThemePreset,
} from "./store-themes";
import { ThemeGalleryPreview } from "./theme-gallery-preview";
import {
  applyThemeCatalog,
  featuredFromCatalog,
  useThemeCatalog,
} from "@/hooks/use-theme-catalog";
import { useAuth } from "@/context/auth";
import { getStorefrontUrl } from "@/lib/storefront";

const CATEGORIES: { id: StoreThemeCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "featured", label: "Top themes" },
  { id: "saved", label: "My themes" },
  { id: "minimal", label: "Minimal" },
  { id: "fashion", label: "Fashion" },
  { id: "beauty", label: "Beauty" },
  { id: "sports", label: "Sports" },
  { id: "food", label: "Food & drink" },
  { id: "digital", label: "Digital" },
  { id: "bold", label: "Bold sales" },
];

function ThemeCard({
  theme,
  active,
  currentThemeId,
  priceCents,
  owned,
  onSelect,
  onApply,
}: {
  theme: StoreThemePreset;
  active: boolean;
  currentThemeId?: string;
  priceCents?: number;
  owned?: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  const layout = resolveThemeLayoutPreview(theme);

  return (
    <li>
      <button
        type="button"
        className={`theme-gallery-card w-full text-left ${
          active ? "is-selected" : ""
        } ${currentThemeId === theme.id ? "is-current" : ""}`}
        onClick={onSelect}
        onDoubleClick={onApply}
      >
        <div className="theme-gallery-card-preview theme-gallery-card-preview--wireframe">
          <ThemeGalleryPreview
            layout={layout}
            primary={theme.preview.primary}
            secondary={theme.preview.secondary}
            background={theme.preview.background}
          />
          {theme.featured ? (
            <span className="theme-gallery-card-badge">Top</span>
          ) : null}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-1">
            <p className="font-semibold text-sm text-zinc-900">{theme.label}</p>
            {theme.inspiredBy ? (
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                ↗ {theme.inspiredBy}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{theme.description}</p>
          {priceCents && priceCents > 0 ? (
            <p className="mt-1 text-xs font-medium text-zinc-800">
              ${(priceCents / 100).toFixed(0)}
              {owned ? " · owned" : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">Free</p>
          )}
          {currentThemeId === theme.id ? (
            <span className="mt-2 inline-block text-xs font-medium text-violet-600">
              Current draft
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function ThemeGalleryModal({
  open,
  onClose,
  onApply,
  onSaveCurrent,
  currentThemeId,
  customPresets = [],
}: {
  open: boolean;
  onClose: () => void;
  onApply: (preset: StoreThemePreset) => void;
  onSaveCurrent?: () => void;
  currentThemeId?: string;
  customPresets?: import("@ugclab/tenant/store-theme").CustomThemePreset[];
}) {
  const [category, setCategory] = useState<StoreThemeCategory>("all");
  const [preview, setPreview] = useState<StoreThemePreset | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const catalogQ = useThemeCatalog(open);
  const catalog = catalogQ.data?.themes;
  const { tenant } = useAuth();
  const storeDemoBase = tenant?.slug ? getStorefrontUrl(tenant.slug) : null;

  function themeDemoUrl(themeId: string) {
    if (!storeDemoBase) return null;
    try {
      const u = new URL(storeDemoBase);
      u.searchParams.set("themePreview", themeId);
      return u.toString();
    } catch {
      const sep = storeDemoBase.includes("?") ? "&" : "?";
      return `${storeDemoBase}${sep}themePreview=${encodeURIComponent(themeId)}`;
    }
  }

  function catalogMeta(id: string) {
    return catalog?.find((row) => row.id === id);
  }

  async function buyTheme(themeId: string) {
    setBuying(true);
    setBuyError(null);
    try {
      const result = await api.buyAddon("THEME", themeId);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      await catalogQ.refetch();
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuying(false);
    }
  }

  if (!open) return null;

  const basePresets = listAllThemePresets(customPresets);
  const catalogPresets = applyThemeCatalog(basePresets, catalog);
  const list =
    category === "featured"
      ? featuredFromCatalog(basePresets, catalog)
      : filterStoreThemes(category, customPresets).filter((t) =>
          catalog?.length ? catalog.some((c) => c.id === t.id) : true
        );
  const sortedList = catalog?.length
    ? applyThemeCatalog(list, catalog)
    : list;
  const featured = featuredFromCatalog(basePresets, catalog);
  const all = catalogPresets.length ? catalogPresets : basePresets;
  const active = preview ?? sortedList[0] ?? all[0];
  const showFeaturedSection = category === "all" && featured.length > 0;

  if (catalogQ.isLoading && !catalog?.length) {
    return (
      <div className="theme-gallery-overlay" role="dialog" aria-modal="true">
        <div className="theme-gallery-panel p-8 text-center text-sm text-zinc-500">
          Loading themes…
        </div>
      </div>
    );
  }

  return (
    <div
      className="theme-gallery-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-gallery-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="theme-gallery-panel theme-gallery-panel--wide">
        <header className="theme-gallery-header">
          <div>
            <h2 id="theme-gallery-title" className="text-lg font-bold text-zinc-900">
              Store themes
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Premium layouts like Shopify Theme Store — full homepage structure, nav & style.
              Customize after applying.
            </p>
          </div>
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-zinc-100 px-4 py-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                category === c.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="theme-gallery-body">
          <div className="theme-gallery-scroll min-h-0 overflow-y-auto p-4">
            {showFeaturedSection ? (
              <section className="mb-6">
                <h3 className="text-sm font-bold text-zinc-900">Top themes</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Full storefront layouts — inspired by popular Shopify paid themes.
                </p>
                <ul className="theme-gallery-grid mt-3">
                  {featured.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      active={active?.id === theme.id}
                      currentThemeId={currentThemeId}
                      priceCents={catalogMeta(theme.id)?.priceCents}
                      owned={catalogMeta(theme.id)?.owned}
                      onSelect={() => setPreview(theme)}
                      onApply={() => {
                        onApply(theme);
                        onClose();
                      }}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {showFeaturedSection ? (
              <h3 className="mb-2 text-sm font-bold text-zinc-900">All themes</h3>
            ) : null}

            <ul className="theme-gallery-grid">
              {(showFeaturedSection
                ? sortedList.filter((t) => !t.featured)
                : sortedList
              ).map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  active={active?.id === theme.id}
                  currentThemeId={currentThemeId}
                  priceCents={catalogMeta(theme.id)?.priceCents}
                  owned={catalogMeta(theme.id)?.owned}
                  onSelect={() => setPreview(theme)}
                  onApply={() => {
                    onApply(theme);
                    onClose();
                  }}
                />
              ))}
            </ul>
          </div>

          {active ? (
            <aside className="theme-gallery-detail">
              <div className="theme-gallery-detail-wireframe mb-4 h-52 overflow-hidden rounded-xl border border-zinc-200">
                <ThemeGalleryPreview
                  layout={resolveThemeLayoutPreview(active)}
                  primary={active.preview.primary}
                  secondary={active.preview.secondary}
                  background={active.preview.background}
                  size="detail"
                />
              </div>
              <h3 className="text-xl font-bold">{active.label}</h3>
              {active.inspiredBy ? (
                <p className="mt-1 text-xs font-medium text-violet-600">
                  Layout inspired by Shopify «{active.inspiredBy}»
                </p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-600">{active.description}</p>
              <ul className="mt-4 space-y-1 text-xs text-zinc-500">
                <li>{active.homeBlocks.length} homepage sections</li>
                <li>Brand color {active.primaryColor}</li>
                <li>
                  {active.theme.fontFamily?.includes("Georgia") ||
                  active.theme.fontFamily?.includes("Cormorant")
                    ? "Serif / luxury typography"
                    : active.theme.buttonStyle === "pill"
                      ? "Rounded pill buttons"
                      : "Modern sans-serif"}
                </li>
                {active.theme.navLinks?.length ? (
                  <li>{active.theme.navLinks.length} custom nav links</li>
                ) : null}
              </ul>
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">Homepage flow</p>
                <p className="mt-1">
                  {active.homeBlocks.map((b) => b.type).join(" → ")}
                </p>
              </div>
              {(() => {
                const meta = catalogMeta(active.id);
                const locked = (meta?.priceCents ?? 0) > 0 && meta?.owned === false;
                return (
                  <>
                    {locked ? (
                      <p className="mt-3 text-sm font-medium text-zinc-800">
                        ${(meta!.priceCents! / 100).toFixed(0)} one-time
                      </p>
                    ) : null}
                    {buyError ? (
                      <p className="mt-2 text-xs text-red-600">{buyError}</p>
                    ) : null}
                    <button
                      type="button"
                      className="ugclab-btn ugclab-btn-primary mt-4 w-full disabled:opacity-50"
                      disabled={buying}
                      onClick={() => {
                        if (locked) {
                          void buyTheme(active.id);
                          return;
                        }
                        onApply(active);
                        onClose();
                      }}
                    >
                      {buying
                        ? "Opening checkout…"
                        : locked
                          ? `Buy ${active.label}`
                          : `Apply ${active.label}`}
                    </button>
                  </>
                );
              })()}
              {themeDemoUrl(active.id) ? (
                <a
                  href={themeDemoUrl(active.id)!}
                  target="_blank"
                  rel="noreferrer"
                  className="ugclab-btn mt-2 flex w-full items-center justify-center gap-1.5 border border-violet-200 bg-violet-50 text-sm font-medium text-violet-800 hover:bg-violet-100"
                >
                  View live demo
                  <span aria-hidden>↗</span>
                </a>
              ) : null}
              {onSaveCurrent ? (
                <button
                  type="button"
                  className="ugclab-btn mt-2 w-full border border-zinc-200 bg-white text-sm"
                  onClick={() => {
                    onSaveCurrent();
                    onClose();
                  }}
                >
                  Save current as my theme
                </button>
              ) : null}
              <p className="mt-2 text-center text-xs text-zinc-400">
                Replaces homepage blocks & theme style. Save draft after applying.
              </p>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
