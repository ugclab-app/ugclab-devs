import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cloneBlocks } from "@ugclab/tenant/store-theme";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { api } from "@/api/client";
import { ThemeGalleryPreview } from "@/components/site-builder/theme-gallery-preview";
import {
  getStoreTheme,
  resolveThemeLayoutPreview,
} from "@/components/site-builder/store-themes";
import { useAuth } from "@/context/auth";
import { useAdminT } from "@/hooks/use-admin-t";
import { getStorefrontUrl } from "@/lib/storefront";

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function themeDemoUrl(slug: string | undefined, themeId: string) {
  if (!slug) return null;
  try {
    const url = new URL(getStorefrontUrl(slug));
    url.searchParams.set("themePreview", themeId);
    return url.toString();
  } catch {
    return null;
  }
}

function AppLook({ id }: { id: string }) {
  if (id === "gift-wrap") {
    return (
      <div className="flex h-28 flex-col justify-center rounded-t-xl bg-zinc-50 px-4">
        <div className="mx-auto w-full max-w-[180px] rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
          <div className="h-1.5 w-14 rounded bg-zinc-200" />
          <div className="mt-2 flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-violet-600" />
            <span className="text-[10px] font-medium text-violet-900">Gift wrap + $5</span>
          </div>
          <div className="mt-2 h-5 rounded bg-zinc-900" />
        </div>
      </div>
    );
  }
  if (id === "priority-support") {
    return (
      <div className="flex h-28 items-center justify-center rounded-t-xl bg-amber-50 px-4">
        <div className="w-full max-w-[180px] rounded-lg border border-amber-200 bg-white p-2.5 shadow-sm">
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
            PRIORITY
          </span>
          <p className="mt-2 text-[11px] font-semibold text-zinc-800">Support request</p>
          <div className="mt-1.5 h-1.5 w-full rounded bg-zinc-100" />
          <div className="mt-1 h-1.5 w-2/3 rounded bg-zinc-100" />
        </div>
      </div>
    );
  }
  if (id === "extra-staff") {
    return (
      <div className="flex h-28 items-center justify-center rounded-t-xl bg-sky-50 px-4">
        <div className="flex w-full max-w-[180px] items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-white p-3 shadow-sm">
          {["A", "B", "C", "+5"].map((label) => (
            <span
              key={label}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (id === "second-store") {
    return (
      <div className="flex h-28 items-center justify-center gap-2 rounded-t-xl bg-violet-50 px-4">
        <div className="w-16 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
          <div className="h-1.5 w-8 rounded bg-violet-500" />
          <div className="mt-1.5 h-6 rounded bg-zinc-100" />
        </div>
        <div className="w-16 rounded-lg border border-violet-300 bg-white p-2 shadow-sm">
          <div className="h-1.5 w-8 rounded bg-violet-500" />
          <div className="mt-1.5 h-6 rounded bg-zinc-100" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-28 flex-col justify-center rounded-t-xl bg-zinc-100 px-4">
      <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 bg-violet-700 px-2 py-1.5 text-white">
          <span className="h-3.5 w-3.5 rounded-sm bg-white/90" />
          <span className="text-[10px] font-semibold">Your store</span>
        </div>
        <p className="px-2 py-2 text-[10px] text-zinc-500">Order #1042 · On the way</p>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const { ta } = useAdminT();
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [giftPrice, setGiftPrice] = useState("3.00");
  const [giftLabel, setGiftLabel] = useState("Add gift wrap");
  const [giftCard, setGiftCard] = useState(true);
  const [giftReady, setGiftReady] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [themeStyle, setThemeStyle] = useState("all");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>(
    params.get("purchased") === "1"
      ? { ok: true, message: ta("appsPage.purchased") }
      : {}
  );

  const q = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => api.marketplace(),
  });

  async function buy(kind: "THEME" | "APP", id: string) {
    setBusy(id);
    setAlert({});
    try {
      const result = await api.buyAddon(kind, id);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      await qc.invalidateQueries({ queryKey: ["marketplace"] });
      await qc.invalidateQueries({ queryKey: ["theme-catalog"] });
      setAlert({ ok: true, message: ta("appsPage.purchased") });
    } catch (e) {
      setAlert({ message: e instanceof Error ? e.message : "Purchase failed" });
    } finally {
      setBusy(null);
    }
  }

  async function applyTheme(id: string) {
    const preset = getStoreTheme(id);
    if (!preset) {
      setAlert({ message: "Theme not found" });
      return;
    }
    setBusy(`apply-${id}`);
    setAlert({});
    try {
      const data = await api.settings();
      const tenant = data.tenant as {
        settings?: {
          themeDraft?: Record<string, unknown>;
          theme?: Record<string, unknown>;
        } | null;
      };
      const current = tenant.settings?.themeDraft ?? tenant.settings?.theme ?? {};
      await api.updateThemeDraft({
        themeDraft: {
          ...current,
          ...preset.theme,
          homeBlocks: cloneBlocks(preset.homeBlocks),
          catalogThemeId: preset.id,
          presetId: preset.id,
        },
        primaryColor: preset.primaryColor,
      });
      setAlert({ ok: true, message: ta("appsPage.applied") });
    } catch (e) {
      setAlert({ message: e instanceof Error ? e.message : "Apply failed" });
    } finally {
      setBusy(null);
    }
  }

  function lossText(id: string) {
    if (id === "gift-wrap") return ta("appsPage.loseGiftWrap");
    if (id === "priority-support") return ta("appsPage.losePriority");
    if (id === "branded-tracking") return ta("appsPage.loseTracking");
    return "";
  }

  async function remove(id: string) {
    const extra = lossText(id);
    if (!window.confirm(`${ta("appsPage.confirmRemove")}${extra ? `\n\n${extra}` : ""}`)) return;
    setBusy(id);
    try {
      await api.removeApp(id);
      await qc.invalidateQueries({ queryKey: ["marketplace"] });
    } catch (e) {
      setAlert({ message: e instanceof Error ? e.message : "Could not remove" });
    } finally {
      setBusy(null);
    }
  }

  const themes = q.data?.themes ?? [];
  const selectedTheme =
    themes.find((theme) => theme.id === selectedThemeId) ?? themes[0] ?? null;
  const selectedPreset = selectedTheme ? getStoreTheme(selectedTheme.id) : undefined;
  const selectedDemo = selectedTheme ? themeDemoUrl(tenant?.slug, selectedTheme.id) : null;
  const apps = q.data?.apps ?? [];
  const purchases = q.data?.purchases ?? [];
  const giftApp = apps.find((a) => a.id === "gift-wrap");

  useEffect(() => {
    if (!giftApp?.owned || !giftApp.config || giftReady) return;
    setGiftPrice((giftApp.config.priceCents / 100).toFixed(2));
    setGiftLabel(giftApp.config.label);
    setGiftCard(giftApp.config.cardEnabled);
    setGiftReady(true);
  }, [giftApp, giftReady]);

  async function saveGift() {
    const priceCents = Math.round(Number(giftPrice) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 20000) {
      setAlert({ message: "Price must be between 0 and 200" });
      return;
    }
    setBusy("gift-settings");
    try {
      await api.saveGiftWrap({ priceCents, label: giftLabel, cardEnabled: giftCard });
      setAlert({ ok: true, message: ta("appsPage.giftSaved") });
    } catch (e) {
      setAlert({ message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  }

  function purchaseStatus(status: string) {
    if (status === "past_due") return ta("appsPage.pastDue");
    if (status === "canceled") return ta("appsPage.canceled");
    return ta("appsPage.owned");
  }

  return (
    <AdminPageShell
      crumbs={[{ label: ta("nav.apps") }]}
      title={ta("appsPage.title")}
      description={ta("appsPage.description")}
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      {q.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      {purchases.length ? (
        <section className="mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">{ta("appsPage.mine")}</h2>
          <ul className="space-y-2">
            {purchases.map((row) => (
              <li key={row.id} className="admin-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-zinc-900">{row.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {money(row.priceCents)}{" "}
                    {row.interval === "month" ? ta("appsPage.month") : ta("appsPage.once")}
                    {" · "}
                    {new Date(row.createdAt).toLocaleDateString()}
                    {row.currentPeriodEnd
                      ? ` · ${ta("appsPage.nextCharge")} ${new Date(row.currentPeriodEnd).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs font-medium text-zinc-600">{purchaseStatus(row.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            {ta("appsPage.themes")}
            <span className="ml-2 font-normal text-zinc-400">{themes.length}</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {["all", "fashion", "beauty", "minimal", "food", "sports", "digital", "bold"].map(
              (style) => (
                <button
                  key={style}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    themeStyle === style
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                  }`}
                  onClick={() => setThemeStyle(style)}
                >
                  {style === "all" ? "All" : style[0]!.toUpperCase() + style.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
        <div className="mt-3 space-y-4">
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themes
              .filter((theme) => themeStyle === "all" || theme.category === themeStyle)
              .map((theme) => {
              const preset = getStoreTheme(theme.id);
              const selected = selectedTheme?.id === theme.id;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    className={`theme-gallery-card w-full overflow-hidden text-left ${
                      selected ? "is-selected" : ""
                    }`}
                    onClick={() => setSelectedThemeId(theme.id)}
                  >
                    <div className="theme-gallery-card-preview theme-gallery-card-preview--wireframe">
                      {preset ? (
                        <ThemeGalleryPreview
                          layout={resolveThemeLayoutPreview(preset)}
                          primary={preset.preview.primary}
                          secondary={preset.preview.secondary}
                          background={preset.preview.background}
                        />
                      ) : null}
                      <span className="theme-gallery-card-badge">
                        {theme.priceCents > 0 ? money(theme.priceCents) : ta("appsPage.free")}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-zinc-900">{theme.label}</p>
                      {theme.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {theme.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
            </ul>

          {selectedTheme && selectedPreset ? (
            <aside className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {ta("appsPage.preview")}
                  </p>
                  <p className="font-semibold text-zinc-900">{selectedTheme.label}</p>
                </div>
                <div className="flex gap-1">
                  {[
                    selectedPreset.preview.primary,
                    selectedPreset.preview.secondary,
                    selectedPreset.preview.background,
                  ].map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-zinc-200"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
              {selectedDemo ? (
                <iframe
                  key={selectedDemo}
                  title={selectedTheme.label}
                  src={selectedDemo}
                  className="h-[680px] w-full bg-white"
                />
              ) : (
                <div className="theme-gallery-card-preview theme-gallery-card-preview--wireframe h-64">
                  <ThemeGalleryPreview
                    layout={resolveThemeLayoutPreview(selectedPreset)}
                    primary={selectedPreset.preview.primary}
                    secondary={selectedPreset.preview.secondary}
                    background={selectedPreset.preview.background}
                    size="detail"
                  />
                </div>
              )}
              <div className="space-y-3 p-4">
                <p className="text-xs text-zinc-500">{ta("appsPage.previewHint")}</p>
                {selectedTheme.description ? (
                  <p className="text-sm text-zinc-600">{selectedTheme.description}</p>
                ) : null}
                <p className="text-sm font-medium text-zinc-900">
                  {selectedTheme.priceCents > 0
                    ? `${money(selectedTheme.priceCents)} ${ta("appsPage.once")}`
                    : ta("appsPage.free")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTheme.owned ? (
                    <button
                      type="button"
                      className="ugclab-btn ugclab-btn-primary text-sm"
                      disabled={busy === `apply-${selectedTheme.id}`}
                      onClick={() => void applyTheme(selectedTheme.id)}
                    >
                      {ta("appsPage.apply")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ugclab-btn ugclab-btn-primary text-sm"
                      disabled={busy === selectedTheme.id}
                      onClick={() => void buy("THEME", selectedTheme.id)}
                    >
                      {ta("appsPage.buy")}
                    </button>
                  )}
                  {selectedDemo ? (
                    <a
                      href={selectedDemo}
                      target="_blank"
                      rel="noreferrer"
                      className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    >
                      {ta("appsPage.openPreview")}
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">{ta("appsPage.apps")}</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {apps.map((app) => (
            <li key={app.id} className="admin-card overflow-hidden">
              <AppLook id={app.id} />
              <div className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{app.category}</p>
              <p className="mt-1 font-medium text-zinc-900">{app.name}</p>
              <p className="mt-1 text-sm text-zinc-500">{app.summary}</p>
              <p className="mt-2 text-sm text-zinc-800">
                {app.priceCents > 0
                  ? `${money(app.priceCents)} ${
                      app.interval === "month" ? ta("appsPage.month") : ta("appsPage.once")
                    }`
                  : ta("appsPage.free")}
              </p>
              {app.id === "gift-wrap" && app.owned ? (
                <form
                  className="mt-3 space-y-2 border-t border-zinc-100 pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveGift();
                  }}
                >
                  <label className="block text-xs text-zinc-500">
                    {ta("appsPage.giftPrice")}
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-900"
                      value={giftPrice}
                      onChange={(e) => setGiftPrice(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    {ta("appsPage.giftLabel")}
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-900"
                      value={giftLabel}
                      onChange={(e) => setGiftLabel(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={giftCard}
                      onChange={(e) => setGiftCard(e.target.checked)}
                    />
                    {ta("appsPage.giftCard")}
                  </label>
                  <button
                    type="submit"
                    className="ugclab-btn text-sm"
                    disabled={busy === "gift-settings"}
                  >
                    {ta("appsPage.saveGift")}
                  </button>
                </form>
              ) : null}
              <div className="mt-3">
                {app.owned ? (
                  <button
                    type="button"
                    className="text-sm text-zinc-500 underline"
                    disabled={busy === app.id}
                    onClick={() => void remove(app.id)}
                  >
                    {ta("appsPage.remove")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary text-sm"
                    disabled={busy === app.id}
                    onClick={() => void buy("APP", app.id)}
                  >
                    {ta("appsPage.buy")}
                  </button>
                )}
              </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminPageShell>
  );
}
