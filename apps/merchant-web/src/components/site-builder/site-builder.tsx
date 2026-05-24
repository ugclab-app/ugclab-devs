import { Fragment, useEffect, useState, type CSSProperties } from "react";
import type { HomeBlock, HomeSection, StoreTheme } from "@ugclab/tenant/store-theme";
import { cloneBlocks, reidBlocks, resolveHomeBlocks } from "@ugclab/tenant/store-theme";
import { BlockPreview } from "./block-preview";
import { BlockInspector } from "./block-inspector";
import { PageStylePanel, type PageStyleState } from "./page-style-panel";
import { catalogByCategory, duplicateBlock } from "./block-catalog";
import { createBlockWithVariant } from "./block-variants";
import {
  PAGE_TEMPLATES,
  getStoreTheme,
  type StoreThemePreset,
} from "./store-themes";
import { ThemeGalleryModal } from "./theme-gallery-modal";
import { BlockPickerModal } from "./block-picker-modal";
import { useBuilderHistory } from "./use-builder-history";

export function SiteBuilder({
  theme,
  primaryColor,
  storeName,
  onBlocksChange,
  pageStyle,
  onPageStyleChange,
  onThemePresetApply,
  onSaveThemePreset,
  customThemePresets,
  appliedThemeId,
  fullscreen = false,
  onToggleFullscreen,
}: {
  theme: StoreTheme;
  primaryColor: string;
  storeName: string;
  onBlocksChange: (blocks: HomeBlock[]) => void;
  pageStyle: PageStyleState;
  onPageStyleChange: (patch: Partial<PageStyleState>) => void;
  onThemePresetApply?: (preset: StoreThemePreset) => void;
  onSaveThemePreset?: () => void;
  customThemePresets?: import("@ugclab/tenant/store-theme").CustomThemePreset[];
  appliedThemeId?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const initial = resolveHomeBlocks(theme);
  const { blocks, commit, undo, redo, resetHistory, canUndo, canRedo } =
    useBuilderHistory(initial);
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"block" | "page">("block");
  const [themeGalleryOpen, setThemeGalleryOpen] = useState(false);

  useEffect(() => {
    onBlocksChange(blocks);
  }, [blocks, onBlocksChange]);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function updateBlocks(next: HomeBlock[]) {
    commit(next);
  }

  function patchBlock(id: string, patch: Partial<HomeBlock>) {
    updateBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function patchSelected(patch: Partial<HomeBlock>) {
    if (!selected) return;
    patchBlock(selected.id, patch);
  }

  function openBlockPicker(atIndex: number | null = null) {
    setInsertAtIndex(atIndex);
    setBlockPickerOpen(true);
  }

  function addBlock(
    type: HomeSection,
    variantId?: string,
    atIndex: number | null = insertAtIndex,
  ) {
    const block = createBlockWithVariant(type, variantId);
    const index = atIndex ?? blocks.length;
    const next = [...blocks];
    next.splice(index, 0, block);
    updateBlocks(next);
    setSelectedId(block.id);
    setInsertAtIndex(null);
    setBlockPickerOpen(false);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    updateBlocks(next);
  }

  function applyTemplate(id: string) {
    const preset = getStoreTheme(id);
    if (preset) applyStoreTheme(preset);
  }

  function applyStoreTheme(preset: StoreThemePreset) {
    if (
      blocks.length > 0 &&
      !window.confirm(
        `Apply "${preset.label}" theme? This replaces ${blocks.length} homepage blocks and updates colors & styles.`
      )
    ) {
      return;
    }
    const nextBlocks = cloneBlocks(preset.homeBlocks);
    resetHistory(nextBlocks);
    setSelectedId(nextBlocks[0]?.id ?? null);
    onPageStyleChange({
      pageBgColor: preset.theme.pageBgColor,
      blockGap: preset.theme.blockGap,
      scrollAnimation: preset.theme.scrollAnimation,
    });
    onThemePresetApply?.(preset);
  }

  function duplicatePage() {
    const copies = reidBlocks(cloneBlocks(blocks));
    updateBlocks([...blocks, ...copies]);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const canvasStyle: CSSProperties = {
    backgroundColor: pageStyle.pageBgColor ?? "#ffffff",
    backgroundImage: pageStyle.pageBgImage
      ? `url(${pageStyle.pageBgImage})`
      : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "local",
  };

  return (
    <div className={`site-builder${fullscreen ? " is-fullscreen" : ""}`}>
      <div className="site-builder-toolbar">
        <div className="site-builder-toolbar-title">
          <span className="site-builder-toolbar-heading">Page constructor</span>
          <span className="site-builder-toolbar-badge">{blocks.length} blocks</span>
        </div>

        <div className="site-builder-toolbar-actions" role="toolbar" aria-label="Page constructor tools">
          {onToggleFullscreen ? (
            <button
              type="button"
              className="site-builder-toolbar-btn site-builder-toolbar-btn--accent"
              onClick={onToggleFullscreen}
              title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
            >
              {fullscreen ? "Exit" : "⛶"}
            </button>
          ) : null}

          <span className="site-builder-toolbar-divider" aria-hidden />

          <button
            type="button"
            className="site-builder-toolbar-btn"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            className="site-builder-toolbar-btn"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>

          <span className="site-builder-toolbar-divider" aria-hidden />

          <button
            type="button"
            className="site-builder-toolbar-btn site-builder-toolbar-btn--accent"
            onClick={() => setThemeGalleryOpen(true)}
          >
            Themes
          </button>
          <select
            className="site-builder-toolbar-select"
            defaultValue=""
            title="Quick apply theme"
            onChange={(e) => {
              const v = e.target.value;
              if (v) applyTemplate(v);
              e.target.value = "";
            }}
          >
            <option value="">Apply…</option>
            {PAGE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="site-builder-toolbar-btn"
            onClick={duplicatePage}
            disabled={blocks.length === 0}
            title="Duplicate all blocks"
          >
            Duplicate
          </button>

          <span className="site-builder-toolbar-divider" aria-hidden />

          <div className="site-builder-viewport-toggle">
            <button
              type="button"
              className={viewport === "desktop" ? "is-active" : ""}
              onClick={() => setViewport("desktop")}
              title="Desktop preview"
            >
              Desktop
            </button>
            <button
              type="button"
              className={viewport === "tablet" ? "is-active" : ""}
              onClick={() => setViewport("tablet")}
              title="Tablet preview"
            >
              Tablet
            </button>
            <button
              type="button"
              className={viewport === "mobile" ? "is-active" : ""}
              onClick={() => setViewport("mobile")}
              title="Mobile preview"
            >
              Mobile
            </button>
          </div>

          <button
            type="button"
            className="site-builder-toolbar-btn site-builder-toolbar-btn--primary"
            onClick={() => openBlockPicker(null)}
          >
            + Add block
          </button>
        </div>
      </div>

      <div className="site-builder-layout">
        <main className="site-builder-canvas-wrap">
          <div
            className={`site-builder-canvas${viewport === "mobile" ? " is-mobile" : ""}${viewport === "tablet" ? " is-tablet" : ""}`}
            style={canvasStyle}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-500">
                <p className="text-lg font-medium text-zinc-700">Start your homepage</p>
                <p className="mt-2 max-w-sm text-sm">
                  Pick a template or add blocks. Click text on the canvas to edit inline.
                </p>
                <button
                  type="button"
                  className="ugclab-btn ugclab-btn-primary mt-6"
                  onClick={() => openBlockPicker(0)}
                >
                  + Choose a block
                </button>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {PAGE_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="ugclab-btn border border-violet-200 bg-violet-50 text-violet-800 text-sm"
                      onClick={() => applyTemplate(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-0">
                <li className="group/parent">
                  <div className="site-builder-add-between">
                    <button
                      type="button"
                      className="site-builder-add-between-btn"
                      onClick={() => openBlockPicker(0)}
                    >
                      + Add block here
                    </button>
                  </div>
                </li>
                {blocks.map((block, idx) => (
                  <Fragment key={block.id}>
                    <li
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx == null || dragIdx === idx) return;
                        move(dragIdx, idx);
                        setDragIdx(null);
                      }}
                      className={`site-builder-block group ${
                        selectedId === block.id ? "is-selected" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(block.id);
                        setInspectorTab("block");
                      }}
                    >
                      <div className="site-builder-block-chrome">
                        <span className="site-builder-block-label">
                          {catalogByCategory()
                            .flatMap((g) => g.items)
                            .find((i) => i.type === block.type)?.label ?? block.type}
                        </span>
                        <div className="site-builder-block-actions">
                          <button
                            type="button"
                            title="Add block below"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBlockPicker(idx + 1);
                            }}
                          >
                            +
                          </button>
                          <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0}>
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => move(idx, idx + 1)}
                            disabled={idx === blocks.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = duplicateBlock(block);
                              const next = [...blocks];
                              next.splice(idx + 1, 0, copy);
                              updateBlocks(next);
                              setSelectedId(copy.id);
                            }}
                          >
                            ⧉
                          </button>
                          <button
                            type="button"
                            className="text-red-600"
                            onClick={() => {
                              const next = blocks.filter((b) => b.id !== block.id);
                              updateBlocks(next);
                              if (selectedId === block.id) setSelectedId(next[0]?.id ?? null);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="site-builder-block-preview">
                        <BlockPreview
                          block={block}
                          primaryColor={primaryColor}
                          storeName={storeName}
                          onPatch={(patch) => patchBlock(block.id, patch)}
                        />
                      </div>
                    </li>
                    <li className="group/parent">
                      <div className="site-builder-add-between">
                        <button
                          type="button"
                          className="site-builder-add-between-btn"
                          onClick={() => openBlockPicker(idx + 1)}
                        >
                          + Add block here
                        </button>
                      </div>
                    </li>
                  </Fragment>
                ))}
              </ul>
            )}
          </div>
        </main>

        <aside className="site-builder-inspector">
          <div className="flex border-b border-zinc-100">
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-semibold ${
                inspectorTab === "block" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500"
              }`}
              onClick={() => setInspectorTab("block")}
            >
              Block
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-semibold ${
                inspectorTab === "page" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500"
              }`}
              onClick={() => setInspectorTab("page")}
            >
              Page
            </button>
          </div>
          <div className="overflow-y-auto max-h-[min(70vh,640px)]">
            {inspectorTab === "page" ? (
              <PageStylePanel style={pageStyle} onChange={onPageStyleChange} />
            ) : (
              <BlockInspector block={selected} onChange={patchSelected} />
            )}
          </div>
        </aside>
      </div>

      <ThemeGalleryModal
        open={themeGalleryOpen}
        onClose={() => setThemeGalleryOpen(false)}
        onApply={applyStoreTheme}
        onSaveCurrent={onSaveThemePreset}
        customPresets={customThemePresets}
        currentThemeId={appliedThemeId}
      />

      <BlockPickerModal
        open={blockPickerOpen}
        onClose={() => {
          setBlockPickerOpen(false);
          setInsertAtIndex(null);
        }}
        onPick={(type, variantId) => addBlock(type, variantId)}
        insertHint={
          insertAtIndex != null
            ? `Block will be inserted at position ${insertAtIndex + 1}.`
            : null
        }
      />
    </div>
  );
}
