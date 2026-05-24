import { useState } from "react";
import {
  filterStoreThemes,
  listAllThemePresets,
  listFeaturedThemes,
  type StoreThemeCategory,
  type StoreThemePreset,
} from "./store-themes";
import { ThemeGalleryPreview } from "./theme-gallery-preview";

const CATEGORIES: { id: StoreThemeCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "featured", label: "Top themes" },
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
  onSelect,
  onApply,
}: {
  theme: StoreThemePreset;
  active: boolean;
  currentThemeId?: string;
  onSelect: () => void;
  onApply: () => void;
}) {
  const wireframe =
    theme.layoutPreview && theme.layoutPreview !== "default";

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
        <div
          className={`theme-gallery-card-preview ${wireframe ? "theme-gallery-card-preview--wireframe" : ""}`}
          style={
            wireframe
              ? undefined
              : {
                  background: `linear-gradient(145deg, ${theme.preview.background} 0%, ${theme.preview.primary}22 50%, ${theme.preview.secondary}33 100%)`,
                }
          }
        >
          {wireframe ? (
            <ThemeGalleryPreview
              layout={theme.layoutPreview!}
              primary={theme.preview.primary}
              secondary={theme.preview.secondary}
              background={theme.preview.background}
            />
          ) : (
            <>
              <div
                className="theme-gallery-card-bar"
                style={{ backgroundColor: theme.preview.primary }}
              />
              <div className="theme-gallery-card-dots">
                <span style={{ background: theme.preview.primary }} />
                <span style={{ background: theme.preview.secondary }} />
                <span
                  style={{
                    background: theme.preview.background,
                    border: "1px solid #e4e4e7",
                  }}
                />
              </div>
            </>
          )}
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

  if (!open) return null;

  const list = filterStoreThemes(category, customPresets);
  const featured = listFeaturedThemes(customPresets);
  const all = listAllThemePresets(customPresets);
  const active = preview ?? list[0] ?? all[0];
  const showFeaturedSection = category === "all" && featured.length > 0;

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
                ? list.filter((t) => !t.featured)
                : list
              ).map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  active={active?.id === theme.id}
                  currentThemeId={currentThemeId}
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
              {active.layoutPreview && active.layoutPreview !== "default" ? (
                <div className="theme-gallery-detail-wireframe mb-4 h-40 overflow-hidden rounded-xl border border-zinc-200">
                  <ThemeGalleryPreview
                    layout={active.layoutPreview}
                    primary={active.preview.primary}
                    secondary={active.preview.secondary}
                    background={active.preview.background}
                  />
                </div>
              ) : (
                <div
                  className="mb-4 h-32 rounded-xl border border-zinc-200"
                  style={{
                    background: `linear-gradient(135deg, ${active.preview.primary}, ${active.preview.secondary})`,
                  }}
                />
              )}
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
              <button
                type="button"
                className="ugclab-btn ugclab-btn-primary mt-4 w-full"
                onClick={() => {
                  onApply(active);
                  onClose();
                }}
              >
                Apply {active.label}
              </button>
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
