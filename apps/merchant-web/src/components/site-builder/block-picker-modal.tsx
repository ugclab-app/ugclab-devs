import { useEffect, useMemo, useState } from "react";
import type { HomeSection } from "@ugclab/tenant/store-theme";
import {
  BLOCK_CATALOG,
  catalogByCategory,
  type BlockCatalogItem,
  type BlockCategory,
} from "./block-catalog";
import { BlockPickerThumb } from "./block-picker-thumb";
import {
  getBlockVariants,
  type BlockDesignVariant,
} from "./block-variants";

const CATEGORY_FILTERS: { id: BlockCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cover", label: "Cover" },
  { id: "content", label: "Content" },
  { id: "store", label: "Store" },
  { id: "social", label: "Social" },
  { id: "marketing", label: "Marketing" },
  { id: "layout", label: "Layout" },
];

function catalogItem(type: HomeSection): BlockCatalogItem | undefined {
  return BLOCK_CATALOG.find((b) => b.type === type);
}

function BlockPickerCard({
  item,
  onPick,
}: {
  item: BlockCatalogItem;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="block-picker-card"
      onClick={onPick}
    >
      <span className="block-picker-card-icon" aria-hidden>
        {item.icon}
      </span>
      <span className="block-picker-card-body">
        <span className="block-picker-card-title">{item.label}</span>
        <span className="block-picker-card-desc">{item.description}</span>
      </span>
      <span className="block-picker-card-wire" data-type={item.type} aria-hidden />
    </button>
  );
}

function VariantCard({
  variant,
  onPick,
}: {
  variant: BlockDesignVariant;
  onPick: () => void;
}) {
  return (
    <button type="button" className="block-picker-variant-card" onClick={onPick}>
      <div className="block-picker-variant-preview">
        <BlockPickerThumb layout={variant.thumb} />
      </div>
      <span className="block-picker-variant-label">{variant.label}</span>
      <span className="block-picker-variant-desc">{variant.description}</span>
    </button>
  );
}

export function BlockPickerModal({
  open,
  onClose,
  onPick,
  insertHint,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: HomeSection, variantId?: string) => void;
  insertHint?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlockCategory | "all">("all");
  const [step, setStep] = useState<"catalog" | "variants">("catalog");
  const [pickedType, setPickedType] = useState<HomeSection | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("all");
    setStep("catalog");
    setPickedType(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setStep((current) => {
        if (current === "variants") {
          setPickedType(null);
          return "catalog";
        }
        onClose();
        return current;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCK_CATALOG.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.type.includes(q)
      );
    });
  }, [query, category]);

  const grouped =
    category === "all" && !query.trim()
      ? catalogByCategory()
      : [
          {
            category: "all" as BlockCategory,
            label: "Results",
            items: filtered,
          },
        ].filter((g) => g.items.length > 0);

  const variants = pickedType ? getBlockVariants(pickedType) : [];
  const pickedCatalog = pickedType ? catalogItem(pickedType) : undefined;

  function pickType(type: HomeSection) {
    setPickedType(type);
    setStep("variants");
  }

  function pickVariant(variantId: string) {
    if (!pickedType) return;
    onPick(pickedType, variantId);
    onClose();
  }

  if (!open) return null;

  const isVariants = step === "variants" && pickedType;

  return (
    <div
      className="block-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`block-picker-panel${isVariants ? " block-picker-panel--variants" : ""}`}>
        <header className="block-picker-header">
          <div>
            {isVariants ? (
              <button
                type="button"
                className="mb-1 flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800"
                onClick={() => {
                  setStep("catalog");
                  setPickedType(null);
                }}
              >
                ← All blocks
              </button>
            ) : null}
            <h2 id="block-picker-title" className="text-lg font-bold text-zinc-900">
              {isVariants ? "Choose a design" : "Choose a block"}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isVariants
                ? `${pickedCatalog?.label ?? pickedType} — pick a layout preset.`
                : (insertHint ?? "Pick a section to add to your page.")}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {!isVariants ? (
          <>
            <div className="block-picker-toolbar">
              <input
                type="search"
                placeholder="Search blocks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ugclab-input flex-1 text-sm"
                autoFocus
              />
              <div className="block-picker-filters">
                {CATEGORY_FILTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`block-picker-filter${category === c.id ? " is-active" : ""}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="block-picker-scroll">
              {grouped.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-500">
                  No blocks match your search.
                </p>
              ) : (
                grouped.map((group) => (
                  <section key={group.category + group.label} className="mb-6 last:mb-0">
                    {category === "all" && !query.trim() ? (
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {group.label}
                      </h3>
                    ) : null}
                    <div className="block-picker-grid">
                      {group.items.map((item) => (
                        <BlockPickerCard
                          key={item.type}
                          item={item}
                          onPick={() => pickType(item.type)}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="block-picker-scroll block-picker-variants-step">
            <div className="block-picker-variant-grid">
              {variants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  onPick={() => pickVariant(variant.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
