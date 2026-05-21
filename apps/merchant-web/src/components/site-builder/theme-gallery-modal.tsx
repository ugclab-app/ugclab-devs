import { useState } from "react";
import {
  filterStoreThemes,
  listAllThemePresets,
  type StoreThemeCategory,
  type StoreThemePreset,
} from "./store-themes";

const CATEGORIES: { id: StoreThemeCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "minimal", label: "Minimal" },
  { id: "fashion", label: "Fashion" },
  { id: "food", label: "Food & drink" },
  { id: "digital", label: "Digital" },
  { id: "bold", label: "Bold sales" },
];

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
  const all = listAllThemePresets(customPresets);
  const active = preview ?? list[0] ?? all[0];

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
      <div className="theme-gallery-panel">
        <header className="theme-gallery-header">
          <div>
            <h2 id="theme-gallery-title" className="text-lg font-bold text-zinc-900">
              Store themes
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Like Shopify — pick a look, then customize. Applies homepage, colors & style.
            </p>
          </div>
          <button type="button" className="text-zinc-400 hover:text-zinc-700 text-xl leading-none" onClick={onClose}>
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
          <ul className="theme-gallery-grid">
            {list.map((theme) => (
              <li key={theme.id}>
                <button
                  type="button"
                  className={`theme-gallery-card w-full text-left ${
                    active?.id === theme.id ? "is-selected" : ""
                  } ${currentThemeId === theme.id ? "is-current" : ""}`}
                  onClick={() => setPreview(theme)}
                  onDoubleClick={() => {
                    onApply(theme);
                    onClose();
                  }}
                >
                  <div
                    className="theme-gallery-card-preview"
                    style={{
                      background: `linear-gradient(145deg, ${theme.preview.background} 0%, ${theme.preview.primary}22 50%, ${theme.preview.secondary}33 100%)`,
                    }}
                  >
                    <div
                      className="theme-gallery-card-bar"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div className="theme-gallery-card-dots">
                      <span style={{ background: theme.preview.primary }} />
                      <span style={{ background: theme.preview.secondary }} />
                      <span style={{ background: theme.preview.background, border: "1px solid #e4e4e7" }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-zinc-900">{theme.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{theme.description}</p>
                    {currentThemeId === theme.id ? (
                      <span className="mt-2 inline-block text-xs font-medium text-violet-600">Current draft</span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {active ? (
            <aside className="theme-gallery-detail">
              <div
                className="mb-4 h-32 rounded-xl border border-zinc-200"
                style={{
                  background: `linear-gradient(135deg, ${active.preview.primary}, ${active.preview.secondary})`,
                }}
              />
              <h3 className="text-xl font-bold">{active.label}</h3>
              <p className="mt-2 text-sm text-zinc-600">{active.description}</p>
              <ul className="mt-4 space-y-1 text-xs text-zinc-500">
                <li>{active.homeBlocks.length} homepage sections</li>
                <li>Brand color {active.primaryColor}</li>
                <li>
                  {active.theme.fontFamily?.includes("Georgia")
                    ? "Serif typography"
                    : active.theme.buttonStyle === "pill"
                      ? "Rounded pill buttons"
                      : "Modern sans-serif"}
                </li>
              </ul>
              <div
                className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600"
                title="Theme preview"
              >
                <p className="font-medium text-zinc-800">Preview</p>
                <p className="mt-1">
                  {active.homeBlocks.slice(0, 4).map((b) => b.type).join(" → ")}
                  {active.homeBlocks.length > 4 ? " …" : ""}
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
