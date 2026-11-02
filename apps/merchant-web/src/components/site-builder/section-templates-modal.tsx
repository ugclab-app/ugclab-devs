import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { filterPublishedSections, useSectionCatalog } from "@/hooks/use-section-catalog";
import { BLOCK_CATALOG } from "./block-catalog";
import { BlockPreview } from "./block-preview";
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

function blockLabel(type: string) {
  return BLOCK_CATALOG.find((item) => item.type === type)?.label ?? type;
}

function SectionTemplateCard({
  template,
  onPick,
  onHover,
}: {
  template: SectionTemplate;
  onPick: () => void;
  onHover: (template: SectionTemplate | null, el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      className="section-template-card"
      onClick={onPick}
      onMouseEnter={(e) => onHover(template, e.currentTarget)}
      onMouseLeave={() => onHover(null, null)}
      onFocus={(e) => onHover(template, e.currentTarget)}
      onBlur={() => onHover(null, null)}
    >
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

function SectionHoverPreview({
  template,
  anchor,
  primaryColor,
  storeName,
}: {
  template: SectionTemplate;
  anchor: DOMRect;
  primaryColor: string;
  storeName: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState(160);
  const [clipped, setClipped] = useState(false);
  const blocks = useMemo(() => template.build(), [template]);
  const scale = 0.5;
  const width = 360;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const full = frame.scrollHeight * scale;
    setFrameHeight(Math.min(full, 440));
    setClipped(full > 442);
  }, [blocks, scale]);

  const margin = 12;
  let left = anchor.right + margin;
  if (left + width > window.innerWidth - 8) left = anchor.left - margin - width;
  if (left < 8) left = Math.max(8, window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, anchor.top), Math.max(8, window.innerHeight - frameHeight - 72));

  return (
    <div
      className="section-template-preview"
      style={{ top, left, width }}
      aria-hidden
    >
      <div className="section-template-preview-head">
        <span>{template.label}</span>
        <span>{blocks.map((block) => blockLabel(block.type)).join(" · ")}</span>
      </div>
      <div
        className={`section-template-preview-body${clipped ? " is-clipped" : ""}`}
        style={{ height: frameHeight }}
      >
        <div
          ref={frameRef}
          className="section-template-preview-scale"
          style={{ width: width / scale, transform: `scale(${scale})` }}
        >
          {blocks.map((block) => (
            <BlockPreview
              key={block.id}
              block={block}
              primaryColor={primaryColor}
              storeName={storeName}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SectionTemplatesModal({
  open,
  onClose,
  onPick,
  insertHint,
  primaryColor = "#6d28d9",
  storeName = "Your store",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (templateId: string) => void;
  insertHint?: string | null;
  primaryColor?: string;
  storeName?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SectionTemplateCategory>("all");
  const [hover, setHover] = useState<{ template: SectionTemplate; rect: DOMRect } | null>(null);
  const sectionCatalogQ = useSectionCatalog(open);
  const allowedSectionIds = sectionCatalogQ.data?.sectionIds;
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const hoverRef = useRef(hover);
  const cardEl = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  hoverRef.current = hover;

  useEffect(() => {
    return () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setHover(null);
      return;
    }
    setQuery("");
    setCategory("all");
    setHover(null);
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

  function clearHoverTimers() {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }

  function onCardHover(template: SectionTemplate | null, el: HTMLButtonElement | null) {
    clearHoverTimers();
    if (!template || !el) {
      hideTimer.current = window.setTimeout(() => {
        cardEl.current = null;
        setHover(null);
      }, 90);
      return;
    }
    cardEl.current = el;
    const show = () => setHover({ template, rect: el.getBoundingClientRect() });
    if (hoverRef.current) show();
    else showTimer.current = window.setTimeout(show, 140);
  }

  function onListScroll() {
    const el = cardEl.current;
    const current = hoverRef.current;
    const scroller = scrollRef.current;
    if (!el || !current || !scroller) return;
    const rect = el.getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    if (rect.bottom < bounds.top + 4 || rect.top > bounds.bottom - 4) {
      setHover(null);
      return;
    }
    setHover({ template: current.template, rect });
  }

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

        <div ref={scrollRef} className="block-picker-scroll" onScroll={onListScroll}>
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
                  onHover={onCardHover}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {hover ? (
        <SectionHoverPreview
          key={hover.template.id}
          template={hover.template}
          anchor={hover.rect}
          primaryColor={primaryColor}
          storeName={storeName}
        />
      ) : null}
    </div>
  );
}
