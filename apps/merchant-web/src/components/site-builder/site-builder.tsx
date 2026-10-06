import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { HomeBlock, HomeSection, StoreTheme } from "@ugclab/tenant/store-theme";
import { cloneBlocks, reidBlocks, resolveHomeBlocks } from "@ugclab/tenant/store-theme";
import { BlockPreview } from "./block-preview";
import { BlockInspector } from "./block-inspector";
import { PageStylePanel, type PageStyleState } from "./page-style-panel";
import { duplicateBlock } from "./block-catalog";
import { createBlockWithVariant } from "./block-variants";
import {
  PAGE_TEMPLATES,
  getStoreTheme,
  type StoreThemePreset,
} from "./store-themes";
import { ThemeGalleryModal } from "./theme-gallery-modal";
import { BlockPickerModal } from "./block-picker-modal";
import { SectionTemplatesModal } from "./section-templates-modal";
import { getSectionTemplate } from "./section-templates";
import { BuilderOverlayPreview } from "./builder-overlay-preview";
import { useBuilderHistory } from "./use-builder-history";
import { BuilderSectionsTree } from "./builder-sections-tree";
import {
  BuilderFooterChrome,
  BuilderShellChrome,
} from "./builder-shell-chrome";
import {
  BuilderAppsInspector,
  BuilderShellInspector,
  BuilderThemeInspector,
} from "./builder-shell-inspector";
import { ProductInlineEditor } from "./product-inline-editor";
import {
  ProductPageCanvas,
  type ProductPreviewData,
} from "./product-page-canvas";
import { ProductPageFixedChrome } from "./product-page-fixed-chrome";
import {
  orderSectionsByType,
  sectionsAlreadyOrdered,
} from "./order-sections";
import {
  BUILDER_TEMPLATE_OPTIONS,
  type BuilderSelection,
  type BuilderTemplateId,
  blockTypeLabel,
} from "./builder-types";

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
  builderTemplate = "home",
  onBuilderTemplateChange,
  onShellChange,
  shellTheme,
  previewProduct = null,
  onOpenProductPage,
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
  builderTemplate?: BuilderTemplateId;
  onBuilderTemplateChange?: (id: BuilderTemplateId) => void;
  onShellChange?: (patch: Partial<StoreTheme>) => void;
  /** Live shell chrome (header/footer/announcement); defaults to `theme`. */
  shellTheme?: StoreTheme;
  /** When editing Product page template — shown as PDP chrome. */
  previewProduct?: ProductPreviewData | null;
  /** From catalog card: open Product page template for this product. */
  onOpenProductPage?: (product: { id: string; slug: string }) => void;
}) {
  const shell = shellTheme ?? theme;
  const showShell = builderTemplate === "home" || builderTemplate === "product";
  const showProduct = builderTemplate === "product";
  const initial = resolveHomeBlocks(theme);
  const { blocks, commit, undo, redo, resetHistory, canUndo, canRedo } =
    useBuilderHistory(initial);
  const [selection, setSelection] = useState<BuilderSelection | null>(() => {
    if (showProduct && previewProduct) {
      return { kind: "product", id: previewProduct.id };
    }
    if (blocks[0]) return { kind: "block", id: blocks[0].id };
    if (showShell) return { kind: "header" };
    return null;
  });
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [themeGalleryOpen, setThemeGalleryOpen] = useState(false);

  useEffect(() => {
    onBlocksChange(blocks);
  }, [blocks, onBlocksChange]);

  const selectedBlock = useMemo(() => {
    if (selection?.kind === "block") {
      return blocks.find((b) => b.id === selection.id) ?? null;
    }
    if (selection?.kind === "product" && selection.blockId) {
      return blocks.find((b) => b.id === selection.blockId) ?? null;
    }
    return null;
  }, [blocks, selection]);

  const selectedProductId =
    selection?.kind === "product" ? selection.id : null;

  useEffect(() => {
    if (showProduct && previewProduct) {
      setSelection({ kind: "product", id: previewProduct.id });
    }
  }, [showProduct, previewProduct?.id]);

  function select(sel: BuilderSelection) {
    setSelection(sel);
  }

  function updateBlocks(next: HomeBlock[]) {
    commit(next);
  }

  function patchBlock(id: string, patch: Partial<HomeBlock>) {
    updateBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function patchSelected(patch: Partial<HomeBlock>) {
    if (!selectedBlock) return;
    patchBlock(selectedBlock.id, patch);
  }

  function openBlockPicker(atIndex: number | null = null) {
    setInsertAtIndex(atIndex);
    setBlockPickerOpen(true);
  }

  function openSectionPicker(atIndex: number | null = null) {
    setInsertAtIndex(atIndex);
    setSectionPickerOpen(true);
  }

  function addSection(templateId: string, atIndex: number | null = insertAtIndex) {
    const template = getSectionTemplate(templateId);
    if (!template) return;
    const newBlocks = template.build();
    const index = atIndex ?? blocks.length;
    const next = [...blocks];
    next.splice(index, 0, ...newBlocks);
    updateBlocks(next);
    setSelection(newBlocks[0] ? { kind: "block", id: newBlocks[0].id } : null);
    setInsertAtIndex(null);
    setSectionPickerOpen(false);
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
    setSelection({ kind: "block", id: block.id });
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
    if (showProduct) {
      if (
        !window.confirm(
          `Apply "${preset.label}" colors & header/footer to the store? Product page sections stay as they are (themes don’t include a product layout yet).`
        )
      ) {
        return;
      }
      onPageStyleChange({
        pageBgColor: preset.theme.pageBgColor,
        blockGap: preset.theme.blockGap,
        scrollAnimation: preset.theme.scrollAnimation,
      });
      onThemePresetApply?.(preset);
      onShellChange?.(preset.theme);
      return;
    }
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
    setSelection(nextBlocks[0] ? { kind: "block", id: nextBlocks[0].id } : null);
    onPageStyleChange({
      pageBgColor: preset.theme.pageBgColor,
      blockGap: preset.theme.blockGap,
      scrollAnimation: preset.theme.scrollAnimation,
    });
    onThemePresetApply?.(preset);
    onShellChange?.(preset.theme);
  }

  function duplicatePage() {
    const copies = reidBlocks(cloneBlocks(blocks));
    updateBlocks([...blocks, ...copies]);
  }

  function putSectionsInOrder() {
    if (blocks.length < 2 || sectionsAlreadyOrdered(blocks)) return;
    const next = orderSectionsByType(blocks);
    updateBlocks(next);
    if (next[0]) setSelection({ kind: "block", id: next[0].id });
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

  const templateLabel =
    BUILDER_TEMPLATE_OPTIONS.find((t) => t.id === builderTemplate)?.label ??
    "Home page";

  return (
    <div className={`site-builder${fullscreen ? " is-fullscreen" : ""}`}>
      <div className="site-builder-toolbar">
        <div className="site-builder-toolbar-title">
          {onBuilderTemplateChange ? (
            <select
              className="site-builder-template-select"
              value={builderTemplate}
              onChange={(e) =>
                onBuilderTemplateChange(e.target.value as BuilderTemplateId)
              }
              title="Template"
              aria-label="Template"
            >
              {BUILDER_TEMPLATE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="site-builder-toolbar-heading">{templateLabel}</span>
          )}
          <span className="site-builder-toolbar-badge">{blocks.length} sections</span>
        </div>

        <div className="site-builder-toolbar-actions" role="toolbar" aria-label="Theme editor tools">
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
            className="site-builder-toolbar-btn"
            onClick={() => select({ kind: "theme" })}
            title="Theme settings"
          >
            ⚙
          </button>
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
          <button
            type="button"
            className="site-builder-toolbar-btn site-builder-toolbar-btn--accent"
            onClick={putSectionsInOrder}
            disabled={blocks.length < 2 || sectionsAlreadyOrdered(blocks)}
            title="Cover → Features → Catalog → Story → Reviews → Newsletter → Contact"
          >
            Put in order
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
              aria-label="Mobile preview"
            >
              Mobile
            </button>
          </div>

          <button
            type="button"
            className="site-builder-toolbar-btn site-builder-toolbar-btn--primary"
            onClick={() => openSectionPicker(null)}
          >
            + Section
          </button>
        </div>
      </div>

      <div className="site-builder-layout has-sections-tree">
        <BuilderSectionsTree
          blocks={blocks}
          selection={selection}
          onSelect={select}
          onAddSection={openSectionPicker}
          onPutInOrder={putSectionsInOrder}
          showShell={showShell}
          announcementEnabled={shell.announcementEnabled === true}
          showProduct={showProduct}
          previewProductId={previewProduct?.id}
          previewProductTitle={previewProduct?.title}
        />

        <main className="site-builder-canvas-wrap">
          <div
            className={`site-builder-canvas${viewport === "mobile" ? " is-mobile" : ""}${viewport === "tablet" ? " is-tablet" : ""}`}
            style={canvasStyle}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelection(null);
            }}
          >
            {pageStyle.customCss?.trim() ? (
              <style dangerouslySetInnerHTML={{ __html: pageStyle.customCss }} />
            ) : null}

            {showShell ? (
              <BuilderShellChrome
                theme={shell}
                storeName={storeName}
                primaryColor={primaryColor}
                selection={selection}
                onSelect={select}
              />
            ) : null}

            {showProduct && previewProduct ? (
              <ProductPageCanvas
                product={previewProduct}
                primaryColor={primaryColor}
                selection={selection}
                onSelectProduct={() =>
                  select({ kind: "product", id: previewProduct.id })
                }
              />
            ) : null}

            {showProduct && !previewProduct ? (
              <div className="border-b border-zinc-100 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
                Pick a product to preview this template, or open one from the Catalog on the home page.
              </div>
            ) : null}

            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                <p className="text-lg font-medium text-zinc-700">
                  {showProduct
                    ? "Add sections under the product"
                    : "Start this template"}
                </p>
                <p className="mt-2 max-w-sm text-sm">
                  {showProduct
                    ? "Text, images, features, reviews, newsletter — same sections as the home page. They show on every product page under the buy box."
                    : "Add a ready-made section, pick a full theme, or build block by block."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary"
                    onClick={() => openSectionPicker(0)}
                  >
                    + Add section
                  </button>
                  <button
                    type="button"
                    className="ugclab-btn border border-zinc-200 bg-white text-zinc-800"
                    onClick={() => openBlockPicker(0)}
                  >
                    + Add block
                  </button>
                </div>
              </div>
            ) : (
              <ul className="space-y-0">
                <li className="group/parent">
                  <div className="site-builder-add-between site-builder-add-between--dual">
                    <button
                      type="button"
                      className="site-builder-add-between-btn"
                      onClick={() => openSectionPicker(0)}
                    >
                      +
                    </button>
                  </div>
                </li>
                {blocks.map((block, idx) => {
                  const selected =
                    (selection?.kind === "block" && selection.id === block.id) ||
                    (selection?.kind === "product" &&
                      selection.blockId === block.id);
                  const label = blockTypeLabel(block.type);
                  return (
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
                        className={`site-builder-block group ${selected ? "is-selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          select({ kind: "block", id: block.id });
                        }}
                      >
                        <span className="site-builder-block-float-label">{label}</span>
                        <button
                          type="button"
                          className="site-builder-block-float-add site-builder-block-float-add--above"
                          title="Add section above"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSectionPicker(idx);
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="site-builder-block-float-add site-builder-block-float-add--below"
                          title="Add section below"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSectionPicker(idx + 1);
                          }}
                        >
                          +
                        </button>
                        <div className="site-builder-block-chrome">
                          <span className="site-builder-block-label">{label}</span>
                          <div className="site-builder-block-actions">
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
                                select({ kind: "block", id: copy.id });
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
                                if (selected) {
                                  setSelection(
                                    next[0] ? { kind: "block", id: next[0].id } : null
                                  );
                                }
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
                          selectedProductId={
                            selection?.kind === "product" ? selection.id : null
                          }
                          onSelectProduct={(product) => {
                            if (onOpenProductPage) {
                              onOpenProductPage({
                                id: product.id,
                                slug: product.slug,
                              });
                              return;
                            }
                            select({
                              kind: "product",
                              id: product.id,
                              blockId: block.id,
                            });
                          }}
                        />
                          <BuilderOverlayPreview block={block} />
                        </div>
                      </li>
                      <li className="group/parent">
                        <div className="site-builder-add-between site-builder-add-between--dual">
                          <button
                            type="button"
                            className="site-builder-add-between-btn"
                            onClick={() => openSectionPicker(idx + 1)}
                          >
                            +
                          </button>
                        </div>
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
            )}

            {showProduct ? <ProductPageFixedChrome /> : null}

            {showShell ? (
              <BuilderFooterChrome
                theme={shell}
                storeName={storeName}
                selection={selection}
                onSelect={select}
              />
            ) : null}
          </div>
        </main>

        <aside className="site-builder-inspector">
          {selection?.kind === "product" ? (
            <ProductInlineEditor
              productId={selection.id}
              onClose={() => {
                if (showProduct) {
                  setSelection(
                    blocks[0] ? { kind: "block", id: blocks[0].id } : null
                  );
                  return;
                }
                if (selection.blockId) {
                  select({ kind: "block", id: selection.blockId });
                  return;
                }
                setSelection(null);
              }}
            />
          ) : selection?.kind === "theme" ? (
            <BuilderThemeInspector
              pageStyle={pageStyle}
              onPageStyleChange={onPageStyleChange}
            />
          ) : selection?.kind === "apps" ? (
            <BuilderAppsInspector />
          ) : selection?.kind === "announcement" ||
            selection?.kind === "header" ||
            selection?.kind === "footer" ? (
            <BuilderShellInspector
              kind={selection.kind}
              theme={shell}
              onShellChange={onShellChange}
            />
          ) : (
            <>
              <div className="flex border-b border-zinc-100">
                <button
                  type="button"
                  className="flex-1 border-b-2 border-violet-600 py-2.5 text-xs font-semibold text-violet-700"
                >
                  Section
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 text-xs font-semibold text-zinc-500"
                  onClick={() => select({ kind: "theme" })}
                >
                  Theme
                </button>
              </div>
              <div className="max-h-[min(70vh,640px)] overflow-y-auto">
                {selectedBlock ? (
                  <BlockInspector
                    block={selectedBlock}
                    onChange={patchSelected}
                    selectedProductId={selectedProductId}
                    onSelectProduct={(product) => {
                      if (onOpenProductPage) {
                        onOpenProductPage({
                          id: product.id,
                          slug: product.slug,
                        });
                        return;
                      }
                      select({
                        kind: "product",
                        id: product.id,
                        blockId: selectedBlock.id,
                      });
                    }}
                  />
                ) : (
                  <div className="p-4 text-sm text-zinc-500">
                    Select a section in the preview or left panel.
                    <div className="mt-4">
                      <PageStylePanel style={pageStyle} onChange={onPageStyleChange} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
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

      <SectionTemplatesModal
        open={sectionPickerOpen}
        onClose={() => {
          setSectionPickerOpen(false);
          setInsertAtIndex(null);
        }}
        onPick={(templateId) => addSection(templateId)}
        insertHint={
          insertAtIndex != null
            ? `Section will be inserted at position ${insertAtIndex + 1}.`
            : null
        }
      />
    </div>
  );
}
