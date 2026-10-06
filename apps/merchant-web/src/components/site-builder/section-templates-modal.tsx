import { useEffect, useMemo, useState } from "react";
import { filterPublishedSections, useSectionCatalog } from "@/hooks/use-section-catalog";
import {
  sectionCategoryLabel,
  sectionTemplatesByCategory,
  type SectionTemplate,
  type SectionTemplateCategory,
} from "./section-templates";

const CATEGORY_FILTERS: { id: SectionTemplateCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "product", label: "Product" },
  { id: "store", label: "Store" },
  { id: "promo", label: "Promo" },
  { id: "trust", label: "Trust" },
  { id: "content", label: "Content" },
];

function SectionTemplateCard({
  template,
  onPick,
}: {
  template: SectionTemplate;
  onPick: () => void;
}) {
  return (
    <button type="button" className="section-template-card" onClick={onPick}>
      <span className="section-template-card-icon" aria-hidden>
        {template.icon}
      </span>
      <span className="section-template-card-body">
        <span className="section-template-card-title">{template.label}</span>
        <span className="section-template-card-desc">{template.description}</span>
        <span className="section-template-card-meta">
          {template.blockCount} block{template.blockCount === 1 ? "" : "s"} ·{" "}
          {sectionCategoryLabel(template.category)}
        </span>
      </span>
    </button>
  );
}

export function SectionTemplatesModal({
  open,
  onClose,
  onPick,
  insertHint,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (templateId: string) => void;
  insertHint?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SectionTemplateCategory>("all");
  const sectionCatalogQ = useSectionCatalog(open);
  const allowedSectionIds = sectionCatalogQ.data?.sectionIds;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("all");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filterPublishedSections(
      sectionTemplatesByCategory(category),
      allowedSectionIds,
    );
    return base.filter((t) => {
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.includes(q)
      );
    });
  }, [query, category, allowedSectionIds]);

  if (!open) return null;

  return (
    <div
      className="block-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-templates-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="block-picker-panel">
        <header className="block-picker-header">
          <div>
            <h2 id="section-templates-title" className="text-lg font-bold text-zinc-900">
              Add section
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {insertHint ??
                "Ready-made groups of blocks — text and layout you can edit after inserting."}
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

        <div className="block-picker-toolbar">
          <input
            type="search"
            placeholder="Search sections…"
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
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">No sections match your search.</p>
          ) : (
            <div className="section-template-grid">
              {filtered.map((template) => (
                <SectionTemplateCard
                  key={template.id}
                  template={template}
                  onPick={() => {
                    onPick(template.id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
