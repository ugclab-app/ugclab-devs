import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/components/store-appearance-fields";
import { buildThemeFromForm } from "@/lib/store-theme-form";
import { MediaPicker } from "@/components/media-picker";
import { StorefrontPreview } from "@/components/storefront-preview";
import { SiteBuilder } from "@/components/site-builder/site-builder";
import { SiteBuilderFullscreenShell } from "@/components/site-builder/site-builder-fullscreen";
import { StoreNavMenuEditor } from "@/components/store-nav-menu-editor";
import { parseStoreTheme, resolveHomeBlocks, type HomeBlock, type StoreTheme } from "@ugclab/tenant/store-theme";
import type { PageStyleState } from "@/components/site-builder/page-style-panel";
import type { StoreThemePreset } from "@/components/site-builder/store-themes";
import type { CustomThemePreset } from "@ugclab/tenant/store-theme";
import { cloneBlocks } from "@ugclab/tenant/store-theme";

const TABS = [
  { id: "home", label: "Site builder" },
  { id: "appearance", label: "Appearance" },
  { id: "menu", label: "Menu" },
  { id: "announcement", label: "Announcement" },
  { id: "checkout", label: "Checkout & email" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function StorefrontPage() {
  const { tenant, refresh } = useAuth();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<TabId>("home");
  const [builderFullscreen, setBuilderFullscreen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const homeBlocksRef = useRef<HomeBlock[]>([]);
  const pageStyleRef = useRef<PageStyleState>({
    pageBgColor: undefined,
    pageBgImage: undefined,
    blockGap: "md",
    scrollAnimation: "none",
  });
  const themeExtrasRef = useRef<Partial<StoreTheme>>({});
  const [builderPrimary, setBuilderPrimary] = useState<string | null>(null);
  const [appliedThemeId, setAppliedThemeId] = useState<string | undefined>();

  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.settings() });
  const { data: productsData } = useQuery({
    queryKey: ["products", "preview"],
    queryFn: () => api.products(new URLSearchParams()),
  });

  if (!tenant) return null;

  const s = tenant.settings as Record<string, unknown> | null | undefined;
  const draftTheme = parseStoreTheme(s?.themeDraft ?? s?.theme);
  if (homeBlocksRef.current.length === 0) {
    homeBlocksRef.current = resolveHomeBlocks(draftTheme);
  }
  pageStyleRef.current = {
    pageBgColor: draftTheme.pageBgColor,
    pageBgImage: draftTheme.pageBgImage,
    blockGap: draftTheme.blockGap ?? "md",
    scrollAnimation: draftTheme.scrollAnimation ?? "none",
  };

  const storeUrl = getStorefrontUrl(tenant.slug);
  const previewBase = `${storeUrl}${storeUrl.includes("?") ? "&" : "?"}preview=1`;
  const settingsPrimary =
    (tenant.settings as { primaryColor?: string } | null)?.primaryColor ?? "#7c3aed";
  const firstProduct = (
    (productsData?.products ?? []) as { slug: string; status?: string }[]
  ).find((p) => p.status !== "DRAFT");

  async function saveDraft(fd: FormData) {
    setPending(true);
    try {
      const base = buildThemeFromForm(fd);
      const primaryFromForm = fd.get("primaryColor");
      const primaryColor =
        typeof primaryFromForm === "string" && primaryFromForm
          ? primaryFromForm
          : builderPrimary ?? settingsPrimary;

      await api.updateSettings({
        ...(primaryColor ? { primaryColor } : {}),
        themeDraft: {
          ...draftTheme,
          ...base,
          ...themeExtrasRef.current,
          ...pageStyleRef.current,
          homeBlocks: homeBlocksRef.current,
          homeSections: homeBlocksRef.current.map((b) => b.type),
          pageBlocks: draftTheme.pageBlocks,
          collectionHeroes: draftTheme.collectionHeroes,
          customThemePresets:
            themeExtrasRef.current.customThemePresets ?? draftTheme.customThemePresets,
        } as StoreTheme,
        checkoutGuestLookup: fd.get("checkoutGuestLookup") === "on",
        checkoutFooterText: fd.get("checkoutFooterText"),
        emailOrderSubject: fd.get("emailOrderSubject"),
        emailOrderBody: fd.get("emailOrderBody"),
      });
      await refresh();
      setAlert({ ok: true, message: "Draft saved" });
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setPending(false);
    }
  }

  async function publish() {
    setPending(true);
    try {
      await api.publishTheme();
      await refresh();
      setAlert({ ok: true, message: "Storefront published" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setPending(false);
    }
  }

  const isBuilder = tab === "home";
  const primaryColor = builderPrimary ?? settingsPrimary;

  useEffect(() => {
    if (tab !== "home" && builderFullscreen) setBuilderFullscreen(false);
  }, [tab, builderFullscreen]);

  function submitDraft() {
    if (!formRef.current) return;
    void saveDraft(new FormData(formRef.current));
  }

  const builderProps = {
    theme: draftTheme,
    primaryColor,
    storeName: tenant.name,
    pageStyle: pageStyleRef.current,
    onPageStyleChange: (patch: Partial<PageStyleState>) => {
      Object.assign(pageStyleRef.current, patch);
    },
    onBlocksChange: (blocks: HomeBlock[]) => {
      homeBlocksRef.current = blocks;
    },
    onThemePresetApply: (preset: StoreThemePreset) => {
      themeExtrasRef.current = { ...preset.theme };
      setBuilderPrimary(preset.primaryColor);
      setAppliedThemeId(preset.id);
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
      void api.updateSettings({
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
              <h1 className="text-2xl font-bold">Storefront</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Customize your buyer-facing shop. Save a draft, preview, then publish.
              </p>
            </div>
            <FormAlert ok={alert.ok} message={alert.message} />

            <nav className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.id
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

        {tab === "home" ? (
          <input type="hidden" name="primaryColor" value={primaryColor} />
        ) : null}

        {tab === "home" ? (
          <SiteBuilderFullscreenShell
            open={builderFullscreen}
            onClose={() => setBuilderFullscreen(false)}
            storeName={tenant.name}
            alert={alert}
            pending={pending}
            onSave={submitDraft}
            onPublish={() => void publish()}
            previewUrl={previewBase}
          >
            <SiteBuilder {...builderProps} />
          </SiteBuilderFullscreenShell>
        ) : null}

        {!builderFullscreen && tab === "appearance" ? (
          <>
            <StoreAppearanceFields theme={draftTheme} />
            <StoreLiveChatFields theme={draftTheme} />
            <StoreSocialFields theme={draftTheme} />
          </>
        ) : null}

        {!builderFullscreen && tab === "menu" ? (
          <StoreNavMenuEditor
            initialLinks={draftTheme.navLinks ?? []}
            hideDefaultNav={draftTheme.hideDefaultNav}
          />
        ) : null}

        {!builderFullscreen && tab === "announcement" ? (
          <StoreAnnouncementFields theme={draftTheme} />
        ) : null}

        {!builderFullscreen && tab === "checkout" ? (
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

        {!builderFullscreen && tab === "advanced" ? (
          <StoreAdvancedFields theme={draftTheme} />
        ) : null}

        {!(builderFullscreen && isBuilder) ? (
          <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
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
            <button
              type="button"
              disabled={pending}
              onClick={publish}
              className="ugclab-btn border border-violet-200 bg-violet-50 text-violet-800"
            >
              Publish to live store
            </button>
          </div>
        ) : null}
      </form>

      {isBuilder && !builderFullscreen ? (
        <div className="space-y-4">
          <StorefrontPreview baseUrl={previewBase} productSlug={firstProduct?.slug ?? null} />
          <p className="text-xs text-zinc-500">
            Save draft to refresh preview. Publish when ready for buyers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <StorefrontPreview baseUrl={previewBase} productSlug={firstProduct?.slug ?? null} />
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
