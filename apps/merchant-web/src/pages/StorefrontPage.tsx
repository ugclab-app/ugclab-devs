import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";
import { getStorefrontUrl } from "@/lib/storefront";
import { FormAlert } from "@/components/form-alert";
import { StoreAppearanceFields } from "@/components/store-appearance-fields";
import { StoreLiveChatFields } from "@/components/store-live-chat-fields";
import {
  StoreAnnouncementFields,
  StoreSocialFields,
  StoreAdvancedFields,
  StoreCheckoutThemeFields,
  StorePasswordFields,
} from "@/components/store-appearance-fields";
import { buildThemeFromForm } from "@/lib/store-theme-form";
import { MediaPicker } from "@/components/media-picker";
import { StorefrontPreview } from "@/components/storefront-preview";
import { SiteBuilder } from "@/components/site-builder/site-builder";
import { SiteBuilderFullscreenShell } from "@/components/site-builder/site-builder-fullscreen";
import { StoreNavMenuEditor } from "@/components/store-nav-menu-editor";
import {
  cloneBlocks,
  parseStoreTheme,
  resolveHomeBlocks,
  type HomeBlock,
  type StoreTheme,
} from "@ugclab/tenant/store-theme";
import type { PageStyleState } from "@/components/site-builder/page-style-panel";
import type { StoreThemePreset } from "@/components/site-builder/store-themes";
import type { CustomThemePreset } from "@ugclab/tenant/store-theme";
import type { BuilderTemplateId } from "@/components/site-builder/builder-types";
import { ThemeVersionPanel } from "@/components/site-builder/theme-version-panel";
import { StoreShellFields } from "@/components/store-shell-fields";
import { ProductPageEditorChrome } from "@/components/site-builder/product-page-editor-chrome";
import { useAdminT } from "@/hooks/use-admin-t";

const TABS = [
  { id: "home", label: "Site builder" },
  { id: "global", label: "Global sections" },
  { id: "product", label: "Product page" },
  { id: "templates", label: "Templates" },
  { id: "shell", label: "Header & footer" },
  { id: "versions", label: "Versions" },
  { id: "appearance", label: "Appearance" },
  { id: "menu", label: "Menu" },
  { id: "announcement", label: "Announcement" },
  { id: "checkout", label: "Checkout & email" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BUILDER_TABS: readonly TabId[] = ["home", "global", "product", "templates"];

function isBuilderTab(id: TabId): boolean {
  return BUILDER_TABS.includes(id);
}

function tabFromBuilderTemplate(id: BuilderTemplateId): TabId {
  if (id === "home") return "home";
  if (id === "global") return "global";
  if (id === "product") return "product";
  return "templates";
}

function builderTemplateFromTab(
  tab: TabId,
  templateKind: "cart" | "notFound" | "collection"
): BuilderTemplateId {
  if (tab === "home") return "home";
  if (tab === "global") return "global";
  if (tab === "product") return "product";
  if (tab === "templates") return templateKind;
  return "home";
}

export default function StorefrontPage() {
  const { ta } = useAdminT();
  const { tenant, refresh } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.id === t)) return t as TabId;
    return "home";
  })();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [previewProductSlug, setPreviewProductSlug] = useState<string | null>(
    searchParams.get("previewProduct")
  );
  const [builderFullscreen, setBuilderFullscreen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const homeBlocksRef = useRef<HomeBlock[]>([]);
  const globalBlocksRef = useRef<HomeBlock[]>([]);
  const productBlocksRef = useRef<HomeBlock[]>([]);
  const cartBlocksRef = useRef<HomeBlock[]>([]);
  const notFoundBlocksRef = useRef<HomeBlock[]>([]);
  const collectionDefaultBlocksRef = useRef<HomeBlock[]>([]);
  const [templateKind, setTemplateKind] = useState<"cart" | "notFound" | "collection">("cart");
  const pageStyleRef = useRef<PageStyleState>({
    pageBgColor: undefined,
    pageBgImage: undefined,
    blockGap: "md",
    scrollAnimation: "none",
    customCss: undefined,
  });
  const themeExtrasRef = useRef<Partial<StoreTheme>>({});
  const [shellRevision, setShellRevision] = useState(0);
  const [builderPrimary, setBuilderPrimary] = useState<string | null>(null);
  const [appliedThemeId, setAppliedThemeId] = useState<string | undefined>();
  const [previewRevision, setPreviewRevision] = useState(0);

  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.settings() });
  const { data: productsData } = useQuery({
    queryKey: ["products", "preview"],
    queryFn: () => api.products(new URLSearchParams({ limit: "50", sort: "newest" })),
  });

  if (!tenant) return null;

  const store = tenant;
  const activeTab: TabId = tab;

  const s = store.settings as Record<string, unknown> | null | undefined;
  const draftTheme = parseStoreTheme(s?.themeDraft ?? s?.theme);
  const liveThemeRaw = s?.theme;
  const draftThemeRaw = s?.themeDraft ?? s?.theme;
  const themeMeta = (() => {
    if (!draftThemeRaw || typeof draftThemeRaw !== "object") {
      return { publishAt: "", abEnabled: false, trafficBPercent: 50 };
    }
    const o = draftThemeRaw as Record<string, unknown>;
    const exp =
      o._experiment && typeof o._experiment === "object"
        ? (o._experiment as Record<string, unknown>)
        : {};
    return {
      publishAt: typeof o._publishAt === "string" ? o._publishAt.slice(0, 16) : "",
      abEnabled: exp.enabled === true,
      trafficBPercent: Number(exp.trafficBPercent) || 50,
    };
  })();
  const hasUnpublishedChanges =
    JSON.stringify(liveThemeRaw ?? null) !== JSON.stringify(draftThemeRaw ?? null);
  if (homeBlocksRef.current.length === 0) {
    homeBlocksRef.current = resolveHomeBlocks(draftTheme);
  }
  if (globalBlocksRef.current.length === 0 && draftTheme.globalBlocks?.length) {
    globalBlocksRef.current = draftTheme.globalBlocks;
  }
  if (productBlocksRef.current.length === 0 && draftTheme.productPageBlocks?.length) {
    productBlocksRef.current = draftTheme.productPageBlocks;
  }
  if (cartBlocksRef.current.length === 0 && draftTheme.cartBlocks?.length) {
    cartBlocksRef.current = draftTheme.cartBlocks;
  }
  if (notFoundBlocksRef.current.length === 0 && draftTheme.notFoundBlocks?.length) {
    notFoundBlocksRef.current = draftTheme.notFoundBlocks;
  }
  if (
    collectionDefaultBlocksRef.current.length === 0 &&
    (draftTheme.collectionPageBlocks?.["_default"]?.length ||
      draftTheme.collectionPageBlocks?.["default"]?.length)
  ) {
    collectionDefaultBlocksRef.current =
      draftTheme.collectionPageBlocks["_default"] ??
      draftTheme.collectionPageBlocks["default"] ??
      [];
  }
  pageStyleRef.current = {
    pageBgColor: draftTheme.pageBgColor,
    pageBgImage: draftTheme.pageBgImage,
    blockGap: draftTheme.blockGap ?? "md",
    scrollAnimation: draftTheme.scrollAnimation ?? "none",
    customCss: draftTheme.customCss,
  };

  const storeUrl = getStorefrontUrl(store.slug);
  const previewBase = `${storeUrl}${storeUrl.includes("?") ? "&" : "?"}preview=1`;
  const settingsPrimary =
    (store.settings as { primaryColor?: string } | null)?.primaryColor ?? "#7c3aed";
  const productRows = (productsData?.products ?? []) as {
    id: string;
    slug: string;
    title: string;
    status?: string;
    priceAmount?: number;
    thumbUrl?: string | null;
    images?: { id?: string; url: string }[];
    description?: string | null;
  }[];
  const firstProduct = productRows.find((p) => p.status !== "DRAFT");
  const previewSlug = previewProductSlug || firstProduct?.slug || null;
  const previewProductRow =
    productRows.find((p) => p.slug === previewSlug) ?? firstProduct ?? null;

  const { data: previewProductDetail } = useQuery({
    queryKey: ["product", previewProductRow?.id, "builder-pdp"],
    queryFn: () => api.product(previewProductRow!.id),
    enabled: Boolean(previewProductRow?.id) && (activeTab === "product" || builderFullscreen),
    staleTime: 15_000,
  });

  const detailProduct = previewProductDetail?.product as
    | {
        id: string;
        slug: string;
        title: string;
        priceAmount: number;
        compareAt?: number | null;
        description?: string | null;
        images?: { id: string; url: string }[];
      }
    | undefined;

  const previewProductForBuilder = detailProduct
    ? {
        id: detailProduct.id,
        slug: detailProduct.slug,
        title: detailProduct.title,
        priceAmount: detailProduct.priceAmount,
        compareAt: detailProduct.compareAt ?? null,
        description: detailProduct.description ?? null,
        currency: previewProductDetail?.currency ?? "USD",
        images: detailProduct.images ?? [],
      }
    : previewProductRow
      ? {
          id: previewProductRow.id,
          slug: previewProductRow.slug,
          title: previewProductRow.title,
          priceAmount: previewProductRow.priceAmount ?? 0,
          description: previewProductRow.description ?? null,
          currency:
            (productsData as { currency?: string } | undefined)?.currency ?? "USD",
          images:
            previewProductRow.images?.length
              ? previewProductRow.images
              : previewProductRow.thumbUrl
                ? [{ url: previewProductRow.thumbUrl }]
                : [],
        }
      : null;

  async function saveDraft(fd: FormData, opts?: { silent?: boolean }) {
    if (!opts?.silent) setPending(true);
    try {
      const base = buildThemeFromForm(fd, draftTheme);
      const settingsStripeTax =
        (store.settings as { stripeTaxEnabled?: boolean } | null)?.stripeTaxEnabled ===
        true;
      const primaryFromForm = fd.get("primaryColor");
      const primaryColor =
        typeof primaryFromForm === "string" && primaryFromForm
          ? primaryFromForm
          : builderPrimary ?? settingsPrimary;

      const themeDraftPayload = {
        ...draftTheme,
        ...base,
        ...themeExtrasRef.current,
        ...pageStyleRef.current,
        homeBlocks: homeBlocksRef.current,
        homeSections: homeBlocksRef.current.map((b) => b.type),
        globalBlocks: globalBlocksRef.current,
        productPageBlocks: productBlocksRef.current,
        cartBlocks: cartBlocksRef.current,
        notFoundBlocks: notFoundBlocksRef.current,
        pageBlocks: draftTheme.pageBlocks,
        collectionPageBlocks: {
          ...(draftTheme.collectionPageBlocks ?? {}),
          _default: collectionDefaultBlocksRef.current,
        },
        collectionHeroes: draftTheme.collectionHeroes,
        customThemePresets:
          themeExtrasRef.current.customThemePresets ?? draftTheme.customThemePresets,
        ...(appliedThemeId ? { catalogThemeId: appliedThemeId } : {}),
        stripeTaxEnabled: settingsStripeTax || base.stripeTaxEnabled === true,
      } as StoreTheme & { catalogThemeId?: string };

      await api.updateThemeDraft({
        themeDraft: themeDraftPayload,
        ...(primaryColor ? { primaryColor } : {}),
      });
      if (activeTab === "checkout") {
        await api.updateSettings({
          name: store.name,
          slug: store.slug,
          checkoutGuestLookup: fd.get("checkoutGuestLookup") === "on",
          checkoutFooterText: fd.get("checkoutFooterText"),
          emailOrderSubject: fd.get("emailOrderSubject"),
          emailOrderBody: fd.get("emailOrderBody"),
        });
      }
      await refresh();
      setPreviewRevision((n) => n + 1);
      if (!opts?.silent) {
        setAlert({
          ok: true,
          message:
            "Draft saved. Click “Publish to live store” so buyers see changes (View my store shows the live theme).",
        });
      }
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      if (!opts?.silent) setPending(false);
    }
  }

  async function publish() {
    setPending(true);
    try {
      const fd = formRef.current ? new FormData(formRef.current) : new FormData();
      await saveDraft(fd, { silent: true });
      await api.publishTheme();
      await refresh();
      setPreviewRevision((n) => n + 1);
      setAlert({ ok: true, message: "Published — your live store is updated." });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setPending(false);
    }
  }

  const isBuilder = isBuilderTab(activeTab);
  const primaryColor = builderPrimary ?? settingsPrimary;
  const liveShellTheme = {
    ...draftTheme,
    ...themeExtrasRef.current,
  } as StoreTheme;
  // shellRevision forces re-render when themeExtrasRef mutates
  void shellRevision;

  const builderTemplate = builderTemplateFromTab(activeTab, templateKind);

  function switchBuilderTemplate(id: BuilderTemplateId) {
    const nextTab = tabFromBuilderTemplate(id);
    setTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", nextTab);
      return next;
    });
    if (id === "cart" || id === "notFound" || id === "collection") {
      setTemplateKind(id);
    }
  }

  function openProductPage(product: { id: string; slug: string }) {
    const slug =
      product.slug ||
      productRows.find((p) => p.id === product.id)?.slug ||
      "";
    if (slug) setPreviewProductSlug(slug);
    setTab("product");
    setBuilderFullscreen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "product");
      if (slug) next.set("previewProduct", slug);
      return next;
    });
  }

  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "product" && builderFullscreen) {
      setBuilderFullscreen(false);
    }
  }, [activeTab, builderFullscreen]);

  function submitDraft() {
    if (!formRef.current) return;
    void saveDraft(new FormData(formRef.current));
  }

  const builderProps = {
    theme: draftTheme,
    primaryColor,
    storeName: store.name,
    pageStyle: pageStyleRef.current,
    onPageStyleChange: (patch: Partial<PageStyleState>) => {
      Object.assign(pageStyleRef.current, patch);
    },
    onBlocksChange: (blocks: HomeBlock[]) => {
      homeBlocksRef.current = blocks;
    },
    onThemePresetApply: (preset: StoreThemePreset) => {
      themeExtrasRef.current = { ...themeExtrasRef.current, ...preset.theme };
      setBuilderPrimary(preset.primaryColor);
      setAppliedThemeId(preset.id);
      setShellRevision((n) => n + 1);
    },
    onSaveThemePreset: () => {
      const label = window.prompt("Name for this theme preset?", "My theme");
      if (!label?.trim()) return;
      const preset: CustomThemePreset = {
        id: `custom_${Date.now().toString(36)}`,
        label: label.trim(),
        savedAt: new Date().toISOString(),
        primaryColor,
        homeBlocks: cloneBlocks(homeBlocksRef.current),
        theme: { ...themeExtrasRef.current, ...pageStyleRef.current },
      };
      const next = [...(draftTheme.customThemePresets ?? []), preset];
      themeExtrasRef.current = { ...themeExtrasRef.current, customThemePresets: next };
      void api.updateThemeDraft({
        themeDraft: {
          ...draftTheme,
          ...themeExtrasRef.current,
          ...pageStyleRef.current,
          homeBlocks: homeBlocksRef.current,
          customThemePresets: next,
        } as StoreTheme,
      }).then(() => {
        setAlert({ ok: true, message: `Saved "${label}"` });
        qc.invalidateQueries({ queryKey: ["settings"] });
      });
    },
    customThemePresets: draftTheme.customThemePresets,
    appliedThemeId,
    fullscreen: builderFullscreen,
    onToggleFullscreen: () => setBuilderFullscreen((f) => !f),
    builderTemplate,
    onBuilderTemplateChange: switchBuilderTemplate,
    shellTheme: liveShellTheme,
    onShellChange: (patch: Partial<StoreTheme>) => {
      themeExtrasRef.current = { ...themeExtrasRef.current, ...patch };
      setShellRevision((n) => n + 1);
    },
    onOpenProductPage: openProductPage,
  };

  return (
    <div className={isBuilder && !builderFullscreen ? "space-y-6" : "grid gap-8 xl:grid-cols-3"}>
      <form
        ref={formRef}
        className={isBuilder ? "space-y-6" : "space-y-6 xl:col-span-2"}
        onSubmit={(e) => {
          e.preventDefault();
          saveDraft(new FormData(e.currentTarget));
        }}
      >
        {!builderFullscreen ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">{ta("storefrontPage.title")}</h1>
              <p className="mt-1 text-sm text-zinc-500">{ta("storefrontPage.description")}</p>
            </div>
            <FormAlert ok={alert.ok} message={alert.message} />
            {hasUnpublishedChanges ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <div>
                  <p className="font-semibold">Unpublished changes</p>
                  <p className="mt-0.5 text-amber-900/80">
                    Buyers still see the live theme. Save draft is editor-only — click Publish to update the storefront.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void publish()}
                  className="ugclab-btn ugclab-btn-primary shrink-0 text-sm"
                >
                  Publish to live store
                </button>
              </div>
            ) : (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
                Live store matches your draft.
              </p>
            )}

            <div className="grid gap-4 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">Schedule publish</p>
                <input
                  type="datetime-local"
                  key={themeMeta.publishAt}
                  defaultValue={themeMeta.publishAt}
                  className="ugclab-input w-full text-sm"
                  id="theme-schedule-at"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="ugclab-btn border border-zinc-200 bg-white text-xs"
                    onClick={() => {
                      const el = document.getElementById(
                        "theme-schedule-at"
                      ) as HTMLInputElement | null;
                      const v = el?.value;
                      setPending(true);
                      void api
                        .scheduleThemePublish(v ? new Date(v).toISOString() : null)
                        .then(async () => {
                          await refresh();
                          setAlert({
                            ok: true,
                            message: v ? "Theme publish scheduled" : "Schedule cleared",
                          });
                        })
                        .catch((e) =>
                          setAlert({
                            ok: false,
                            message: e instanceof Error ? e.message : "Failed",
                          })
                        )
                        .finally(() => setPending(false));
                    }}
                  >
                    Save schedule
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">A/B theme test</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="theme-ab-enabled"
                    defaultChecked={themeMeta.abEnabled}
                  />
                  Serve draft as variant B
                </label>
                <label className="block text-xs text-zinc-600">
                  Traffic to B (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    id="theme-ab-pct"
                    defaultValue={themeMeta.trafficBPercent}
                    className="ugclab-input mt-1 w-full text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  className="ugclab-btn border border-zinc-200 bg-white text-xs"
                  onClick={() => {
                    const enabled = (
                      document.getElementById("theme-ab-enabled") as HTMLInputElement
                    )?.checked;
                    const trafficBPercent = Number(
                      (document.getElementById("theme-ab-pct") as HTMLInputElement)?.value
                    );
                    setPending(true);
                    void api
                      .setThemeExperiment({
                        enabled: !!enabled,
                        trafficBPercent,
                        snapshotVariantB: true,
                      })
                      .then(async () => {
                        await refresh();
                        setAlert({ ok: true, message: "A/B settings saved" });
                      })
                      .catch((e) =>
                        setAlert({
                          ok: false,
                          message: e instanceof Error ? e.message : "Failed",
                        })
                      )
                      .finally(() => setPending(false));
                  }}
                >
                  Save A/B test
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("tab", t.id);
                      return next;
                    });
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === t.id
                      ? "bg-white text-violet-800 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        ) : null}

        {activeTab === "home" ? (
          <input type="hidden" name="primaryColor" value={primaryColor} />
        ) : null}

        {activeTab === "global" ? (
          <section className="admin-card p-4">
            <p className="mb-4 text-sm text-zinc-600">
              Optional sitewide overlays only (logos, promo strip, sticky CTA, discount
              popup). Do not put Cover/Catalog/Newsletter here — those belong on Home or
              Product page, or they will duplicate. Save draft, then publish.
            </p>
            <SiteBuilder
              key="global"
              {...builderProps}
              theme={{ ...draftTheme, homeBlocks: globalBlocksRef.current }}
              onBlocksChange={(blocks) => {
                globalBlocksRef.current = blocks;
              }}
            />
          </section>
        ) : null}

        {activeTab === "product" ? (
          <SiteBuilderFullscreenShell
            open={builderFullscreen}
            onClose={() => setBuilderFullscreen(false)}
            storeName={store.name}
            alert={alert}
            pending={pending}
            onSave={submitDraft}
            onPublish={() => void publish()}
            previewUrl={
              previewProductForBuilder
                ? (() => {
                    const u = new URL(previewBase);
                    u.pathname = `/products/${previewProductForBuilder.slug}`;
                    return u.toString();
                  })()
                : previewBase
            }
          >
            <div
              className={
                builderFullscreen
                  ? "flex h-full min-h-0 flex-col"
                  : "admin-card p-4"
              }
            >
              {!builderFullscreen ? (
                <ProductPageEditorChrome
                  tenantSlug={store.slug}
                  previewProductSlug={previewProductSlug}
                  onPickProduct={(slug) => {
                    setPreviewProductSlug(slug);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("tab", "product");
                      next.set("previewProduct", slug);
                      return next;
                    });
                  }}
                />
              ) : null}
              <SiteBuilder
                key={`product-${previewProductForBuilder?.id ?? "none"}`}
                {...builderProps}
                builderTemplate="product"
                previewProduct={previewProductForBuilder}
                theme={{ ...draftTheme, homeBlocks: productBlocksRef.current }}
                onBlocksChange={(blocks) => {
                  productBlocksRef.current = blocks;
                }}
              />
            </div>
          </SiteBuilderFullscreenShell>
        ) : null}

        {activeTab === "templates" ? (
          <section className="admin-card p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-zinc-600">
                Template
                <select
                  className="ugclab-select mt-1 block"
                  value={templateKind}
                  onChange={(e) =>
                    setTemplateKind(e.target.value as "cart" | "notFound" | "collection")
                  }
                >
                  <option value="cart">Cart page</option>
                  <option value="notFound">404 page</option>
                  <option value="collection">Collection default</option>
                </select>
              </label>
              <p className="text-sm text-zinc-500">
                {templateKind === "cart"
                  ? "Blocks below the cart summary."
                  : templateKind === "notFound"
                    ? "Extra content on the store 404 page."
                    : "Fallback blocks for collections without their own layout."}
              </p>
            </div>
            <SiteBuilder
              key={templateKind}
              {...builderProps}
              theme={{
                ...draftTheme,
                homeBlocks:
                  templateKind === "cart"
                    ? cartBlocksRef.current
                    : templateKind === "notFound"
                      ? notFoundBlocksRef.current
                      : collectionDefaultBlocksRef.current,
              }}
              onBlocksChange={(blocks) => {
                if (templateKind === "cart") cartBlocksRef.current = blocks;
                else if (templateKind === "notFound") notFoundBlocksRef.current = blocks;
                else collectionDefaultBlocksRef.current = blocks;
              }}
            />
          </section>
        ) : null}

        {!builderFullscreen && activeTab === "shell" ? (
          <StoreShellFields theme={draftTheme} />
        ) : null}

        {activeTab === "versions" ? <ThemeVersionPanel /> : null}

        {activeTab === "home" ? (
          <SiteBuilderFullscreenShell
            open={builderFullscreen}
            onClose={() => setBuilderFullscreen(false)}
            storeName={store.name}
            alert={alert}
            pending={pending}
            onSave={submitDraft}
            onPublish={() => void publish()}
            previewUrl={previewBase}
          >
            <SiteBuilder key="home" {...builderProps} />
          </SiteBuilderFullscreenShell>
        ) : null}

        {!builderFullscreen && activeTab === "appearance" ? (
          <>
            <StoreAppearanceFields theme={draftTheme} />
            <StoreLiveChatFields theme={draftTheme} />
            <StoreSocialFields theme={draftTheme} />
          </>
        ) : null}

        {!builderFullscreen && activeTab === "menu" ? (
          <StoreNavMenuEditor
            initialLinks={draftTheme.navLinks ?? []}
            hideDefaultNav={draftTheme.hideDefaultNav}
          />
        ) : null}

        {!builderFullscreen && activeTab === "announcement" ? (
          <StoreAnnouncementFields theme={draftTheme} />
        ) : null}

        {!builderFullscreen && activeTab === "checkout" ? (
          <>
            <StoreCheckoutThemeFields theme={draftTheme} />
            <section className="admin-card space-y-4 p-6">
              <h3 className="font-semibold">Checkout & emails</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="checkoutGuestLookup"
                  defaultChecked={(s?.checkoutGuestLookup as boolean | undefined) !== false}
                />
                Allow guest order lookup on storefront
              </label>
              <label className="block text-sm">
                Checkout footer text
                <textarea
                  name="checkoutFooterText"
                  rows={2}
                  defaultValue={String(s?.checkoutFooterText ?? "")}
                  className="ugclab-input mt-1"
                  placeholder="Secure checkout powered by Stripe."
                />
              </label>
              <label className="block text-sm">
                Order email subject
                <input
                  name="emailOrderSubject"
                  defaultValue={String(
                    s?.emailOrderSubject ?? "Your order #{{orderNumber}} — {{storeName}}"
                  )}
                  className="ugclab-input mt-1"
                />
              </label>
              <label className="block text-sm">
                Order email HTML body
                <textarea
                  name="emailOrderBody"
                  rows={12}
                  defaultValue={String(s?.emailOrderBody ?? "")}
                  placeholder={'<h2>Thank you!</h2><p>Order #{{orderNumber}} — {{total}}</p><p>{{items}}</p>'}
                  className="ugclab-input mt-1 font-mono text-xs"
                />
                <span className="mt-1 block text-xs text-zinc-400">
                  Placeholders: {"{{orderNumber}}"}, {"{{storeName}}"}, {"{{status}}"}, {"{{total}}"}, {"{{items}}"}
                </span>
              </label>
            </section>
          </>
        ) : null}

        {!builderFullscreen && activeTab === "advanced" ? (
          <>
            <StoreAdvancedFields theme={draftTheme} />
            <StorePasswordFields />
          </>
        ) : null}

        {!(builderFullscreen && isBuilder) ? (
          <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <button
              type="button"
              disabled={pending}
              onClick={() => void publish()}
              className="ugclab-btn ugclab-btn-primary"
            >
              {pending ? "Publishing…" : "Publish to live store"}
            </button>
            <button type="submit" disabled={pending} className="ugclab-btn border border-zinc-200 bg-white">
              {pending ? "Saving…" : "Save draft"}
            </button>
            {isBuilder ? (
              <button
                type="button"
                className="ugclab-btn border border-zinc-200 bg-white"
                onClick={() => setBuilderFullscreen(true)}
              >
                Full screen editor
              </button>
            ) : null}
            {hasUnpublishedChanges ? (
              <span className="self-center text-xs font-medium text-amber-700">
                Draft ≠ live
              </span>
            ) : null}
          </div>
        ) : null}
      </form>

      {isBuilder && !builderFullscreen ? (
        <div className="space-y-4">
          <StorefrontPreview
            baseUrl={previewBase}
            productSlug={previewSlug}
            refreshKey={previewRevision}
          />
          <p className="text-xs text-zinc-500">
            Preview uses your draft. Publish to update the live store (View my store).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <StorefrontPreview
            baseUrl={previewBase}
            productSlug={previewSlug}
            refreshKey={previewRevision}
          />
          <section className="admin-card p-6 text-sm">
            <h2 className="font-semibold">Media library</h2>
            <p className="mt-1 text-zinc-500">
              Upload images, then use &quot;Choose image&quot; in the builder or Appearance.
            </p>
            <div className="mt-4">
              <MediaPicker
                onUploaded={() => {
                  setAlert({ ok: true, message: "Uploaded — attach in block properties" });
                }}
              />
            </div>
          </section>
          <p className="text-xs text-zinc-500">
            Live theme differs from draft until you publish.
          </p>
        </div>
      )}
    </div>
  );
}
