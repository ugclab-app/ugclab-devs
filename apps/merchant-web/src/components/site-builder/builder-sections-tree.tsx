import type { HomeBlock } from "@ugclab/tenant/store-theme";
import {
  type BuilderSelection,
  blockTypeLabel,
  selectionEquals,
} from "./builder-types";

export function BuilderSectionsTree({
  blocks,
  selection,
  onSelect,
  onAddSection,
  onPutInOrder,
  showShell,
  announcementEnabled,
  showProduct,
  previewProductId,
  previewProductTitle,
}: {
  blocks: HomeBlock[];
  selection: BuilderSelection | null;
  onSelect: (sel: BuilderSelection) => void;
  onAddSection: (atIndex: number | null) => void;
  onPutInOrder?: () => void;
  showShell: boolean;
  announcementEnabled?: boolean;
  showProduct?: boolean;
  previewProductId?: string | null;
  previewProductTitle?: string | null;
}) {
  function row(
    sel: BuilderSelection,
    label: string,
    opts?: { muted?: boolean; indent?: boolean }
  ) {
    const active = selectionEquals(selection, sel);
    return (
      <button
        type="button"
        onClick={() => onSelect(sel)}
        className={`site-builder-tree-item${active ? " is-active" : ""}${
          opts?.indent ? " is-indent" : ""
        }${opts?.muted ? " is-muted" : ""}`}
      >
        {label}
      </button>
    );
  }

  return (
    <nav className="site-builder-tree" aria-label="Theme sections">
      <div className="site-builder-tree-tabs">
        <button type="button" className="is-active" title="Sections">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          title="Theme settings"
          onClick={() => onSelect({ kind: "theme" })}
          className={selection?.kind === "theme" ? "is-active" : ""}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          title="App embeds"
          onClick={() => onSelect({ kind: "apps" })}
          className={selection?.kind === "apps" ? "is-active" : ""}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      </div>

      <div className="site-builder-tree-scroll">
        {showShell ? (
          <div className="site-builder-tree-group">
            <p className="site-builder-tree-group-label">Header</p>
            {row(
              { kind: "announcement" },
              announcementEnabled ? "Announcement bar" : "Announcement bar (off)",
              { muted: !announcementEnabled }
            )}
            {row({ kind: "header" }, "Header")}
          </div>
        ) : null}

        {showProduct && previewProductId ? (
          <div className="site-builder-tree-group">
            <p className="site-builder-tree-group-label">Product</p>
            {row(
              { kind: "product", id: previewProductId },
              previewProductTitle?.trim() || "Product details"
            )}
          </div>
        ) : null}

        <div className="site-builder-tree-group">
          <p className="site-builder-tree-group-label">
            {showProduct ? "Below buy box" : "Template"}
          </p>
          {blocks.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-zinc-400">
              {showProduct
                ? "No custom sections yet — add text, images, reviews…"
                : "No sections yet"}
            </p>
          ) : (
            blocks.map((b) =>
              row({ kind: "block", id: b.id }, blockTypeLabel(b.type), { indent: true })
            )
          )}
          <button
            type="button"
            className="site-builder-tree-add"
            onClick={() => onAddSection(null)}
          >
            Add section
          </button>
          {onPutInOrder && blocks.length >= 2 ? (
            <button
              type="button"
              className="site-builder-tree-add"
              onClick={onPutInOrder}
              title="Cover → Features → Catalog → Reviews → Newsletter → Contact"
            >
              Put in order
            </button>
          ) : null}
        </div>

        {showProduct ? (
          <div className="site-builder-tree-group">
            <p className="site-builder-tree-group-label">Built-in</p>
            <span className="site-builder-tree-item is-muted is-indent">Reviews</span>
            <span className="site-builder-tree-item is-muted is-indent">Q&A</span>
            <span className="site-builder-tree-item is-muted is-indent">Trust strip</span>
            <span className="site-builder-tree-item is-muted is-indent">Recently viewed</span>
          </div>
        ) : null}

        {showShell ? (
          <div className="site-builder-tree-group">
            <p className="site-builder-tree-group-label">Footer</p>
            {row({ kind: "footer" }, "Footer")}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
