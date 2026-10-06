import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type ThemeRow = {
  id: string;
  label: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  category: string;
  description: string;
  previewUrl: string | null;
  minPlan: string | null;
  deprecated: boolean;
  inCodebase: boolean;
  storeCount: number;
  preview: { primary: string; secondary: string; background: string };
};

type ThemeStore = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  catalogThemeId: string | null;
  publishedThemeId: string | null;
  draftThemeId: string | null;
  hasDraftMismatch: boolean;
  storefrontUrl: string;
  tenantUpdatedAt: string;
};

const STOREFRONT_DEMO =
  import.meta.env.VITE_STOREFRONT_URL ?? "http://localhost:3002";

function ThemePreviewSwatch({ theme }: { theme: ThemeRow }) {
  const { primary, secondary, background } = theme.preview;
  return (
    <div
      className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200"
      style={{
        background: `linear-gradient(145deg, ${background} 0%, ${primary}33 50%, ${secondary}44 100%)`,
      }}
      title={theme.label}
    />
  );
}

function EditThemeModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: ThemeRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(theme.label);
  const [category, setCategory] = useState(theme.category);
  const [description, setDescription] = useState(theme.description);
  const [previewUrl, setPreviewUrl] = useState(theme.previewUrl ?? "");
  const [minPlan, setMinPlan] = useState(theme.minPlan ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.updateTheme(theme.id, {
        label,
        category,
        description,
        previewUrl: previewUrl.trim() || null,
        minPlan: minPlan.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="platform-card w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold">Edit theme</h2>
        <p className="font-mono text-xs text-slate-500">{theme.id}</p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-slate-600">Label</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Category</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Preview URL</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Min plan (optional)</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={minPlan}
              onChange={(e) => setMinPlan(e.target.value)}
              placeholder="pro"
            />
          </label>
          {error ? <p className="text-red-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ugclab-btn border border-slate-200" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary"
            disabled={busy}
            onClick={() => void save()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function StoresDrawer({
  title,
  stores,
  themes,
  onClose,
  onAssign,
}: {
  title: string;
  stores: ThemeStore[];
  themes: ThemeRow[];
  onClose: () => void;
  onAssign: (tenantId: string, themeId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="platform-card h-full w-full max-w-md overflow-y-auto shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-500">
            ✕
          </button>
        </div>
        <ul className="divide-y">
          {stores.map((s) => (
            <li key={s.tenantId} className="px-6 py-4 text-sm">
              <Link to={`/tenants/${s.tenantId}`} className="font-medium text-sky-600">
                {s.tenantName}
              </Link>
              <div className="font-mono text-xs text-slate-500">{s.tenantSlug}</div>
              {s.hasDraftMismatch ? (
                <span className="mt-1 inline-block text-xs text-amber-700">
                  Draft ≠ published
                </span>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <a
                  href={s.storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline"
                >
                  Open storefront
                </a>
                <span className="text-slate-400">
                  Updated {new Date(s.tenantUpdatedAt).toLocaleDateString()}
                </span>
              </div>
              {!s.catalogThemeId || !themes.some((t) => t.id === s.catalogThemeId) ? (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) onAssign(s.tenantId, v);
                    }}
                  >
                    <option value="">Assign theme…</option>
                    {themes
                      .filter((t) => t.published)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}
            </li>
          ))}
          {!stores.length ? (
            <li className="px-6 py-12 text-center text-slate-500">No stores</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"catalog" | "untracked">("catalog");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editTheme, setEditTheme] = useState<ThemeRow | null>(null);
  const [drawer, setDrawer] = useState<{
    title: string;
    stores: ThemeStore[];
  } | null>(null);

  const status = params.get("status") ?? "all";
  const q = params.get("q") ?? "";

  const themesQ = useQuery({
    queryKey: ["themes", status, q],
    queryFn: () => {
      const p = new URLSearchParams();
      if (status !== "all") p.set("status", status);
      if (q) p.set("q", q);
      return api.themes(p);
    },
  });

  const allThemesQ = useQuery({
    queryKey: ["themes", "all", ""],
    queryFn: () => api.themes(),
  });

  const untrackedQ = useQuery({
    queryKey: ["themes-untracked"],
    queryFn: () => api.themeUntracked(),
    enabled: tab === "untracked",
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["themes"] });
    void qc.invalidateQueries({ queryKey: ["themes-untracked"] });
  };

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const themes = (themesQ.data?.themes ?? []) as ThemeRow[];
  const themesForAssign = (allThemesQ.data?.themes ?? themes) as ThemeRow[];
  const summary = themesQ.data?.summary ?? allThemesQ.data?.summary;

  const openStores = async (theme: ThemeRow) => {
    const data = await api.themeStores(theme.id);
    setDrawer({
      title: `Stores — ${theme.label}`,
      stores: data.stores as ThemeStore[],
    });
  };

  const previewAsMerchant = (theme: ThemeRow) => {
    const url = theme.previewUrl ?? `${STOREFRONT_DEMO}/demo?themePreview=${theme.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="platform-page-header">
        <div>
          <h1>Theme catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Controls which themes merchants see in the site builder gallery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ugclab-btn border border-slate-200 bg-white text-sm"
            onClick={() =>
              api.syncThemes().then(() => invalidate()).catch((e) => alert(String(e)))
            }
          >
            Sync from codebase
          </button>
          <button
            type="button"
            className="ugclab-btn border border-slate-200 bg-white text-sm"
            onClick={() => api.exportThemesCsv().catch((e) => alert(String(e)))}
          >
            Export CSV
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total themes", value: summary.total, filter: "all" },
            { label: "Published", value: summary.published, filter: "published" },
            { label: "Featured", value: summary.featured, filter: "featured" },
            {
              label: "Stores with theme",
              value: summary.storesWithTheme,
              filter: null,
            },
            {
              label: "Custom / no id",
              value: summary.customThemeStores,
              filter: null,
              tab: "untracked" as const,
            },
            {
              label: "Draft ≠ live",
              value: summary.draftMismatchStores,
              filter: null,
            },
          ].map((card) => (
            <button
              key={card.label}
              type="button"
              className="platform-stat text-left transition hover:border-sky-200"
              onClick={() => {
                if (card.tab) {
                  setTab(card.tab);
                  return;
                }
                if (card.filter) {
                  setTab("catalog");
                  setFilter("status", card.filter === "all" ? null : card.filter);
                }
              }}
            >
              <p className="text-xs font-medium uppercase text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{card.value}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "catalog"
              ? "border-sky-600 text-sky-700"
              : "border-transparent text-slate-500"
          }`}
          onClick={() => setTab("catalog")}
        >
          Catalog
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "untracked"
              ? "border-sky-600 text-sky-700"
              : "border-transparent text-slate-500"
          }`}
          onClick={() => setTab("untracked")}
        >
          Custom / untracked
          {summary ? ` (${summary.untrackedStores})` : ""}
        </button>
      </div>

      {tab === "catalog" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search id or label…"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilter("q", (e.target as HTMLInputElement).value || null);
                }
              }}
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setFilter("status", e.target.value === "all" ? null : e.target.value)}
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="featured">Featured</option>
              <option value="zero">Zero usage</option>
              <option value="deprecated">Deprecated</option>
            </select>
            {selected.size > 0 ? (
              <>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200 bg-white text-sm"
                  onClick={() =>
                    api
                      .bulkUpdateThemes({ ids: [...selected], published: true })
                      .then(() => {
                        setSelected(new Set());
                        invalidate();
                      })
                  }
                >
                  Publish ({selected.size})
                </button>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200 bg-white text-sm"
                  onClick={() =>
                    api
                      .bulkUpdateThemes({ ids: [...selected], published: false })
                      .then(() => {
                        setSelected(new Set());
                        invalidate();
                      })
                  }
                >
                  Unpublish
                </button>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200 bg-white text-sm"
                  onClick={() =>
                    api
                      .bulkUpdateThemes({ ids: [...selected], featured: true })
                      .then(() => {
                        setSelected(new Set());
                        invalidate();
                      })
                  }
                >
                  Set featured
                </button>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200 bg-white text-sm"
                  onClick={() =>
                    api
                      .bulkUpdateThemes({ ids: [...selected], clearFeatured: true })
                      .then(() => {
                        setSelected(new Set());
                        invalidate();
                      })
                  }
                >
                  Clear featured
                </button>
              </>
            ) : null}
          </div>

          <QueryState query={themesQ}>
            {(data) => {
              const rows = data.themes as ThemeRow[];
              return (
                <div className="platform-card overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="w-10 px-4 py-3" />
                        <th className="px-4 py-3">Theme</th>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Stores</th>
                        <th className="px-4 py-3">Published</th>
                        <th className="px-4 py-3">Featured</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((t) => (
                        <tr key={t.id} className={t.deprecated ? "bg-amber-50/50" : undefined}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(t.id)}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(t.id);
                                else next.delete(t.id);
                                setSelected(next);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ThemePreviewSwatch theme={t} />
                              <div>
                                <div className="font-medium">{t.label}</div>
                                <div className="font-mono text-xs text-slate-500">{t.id}</div>
                                <div className="text-xs text-slate-400">{t.category}</div>
                                {!t.inCodebase ? (
                                  <span className="text-xs text-amber-700">Not in codebase</span>
                                ) : null}
                                {t.deprecated ? (
                                  <span className="text-xs text-amber-700">Deprecated</span>
                                ) : null}
                                {t.minPlan ? (
                                  <span className="text-xs text-slate-500">
                                    Plan: {t.minPlan}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs">{t.sortOrder}</span>
                              <button
                                type="button"
                                className="rounded px-1 text-slate-500 hover:bg-slate-100"
                                title="Move up"
                                onClick={() =>
                                  api.moveTheme(t.id, "up").then(() => invalidate())
                                }
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="rounded px-1 text-slate-500 hover:bg-slate-100"
                                title="Move down"
                                onClick={() =>
                                  api.moveTheme(t.id, "down").then(() => invalidate())
                                }
                              >
                                ↓
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-medium text-sky-600 hover:underline"
                              onClick={() => void openStores(t)}
                            >
                              {t.storeCount}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={t.published}
                              onChange={(e) =>
                                api
                                  .updateTheme(t.id, { published: e.target.checked })
                                  .then(() => invalidate())
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={t.featured}
                              onChange={(e) =>
                                api
                                  .updateTheme(t.id, { featured: e.target.checked })
                                  .then(() => invalidate())
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2 text-xs">
                              <button
                                type="button"
                                className="text-sky-600 hover:underline"
                                onClick={() => setEditTheme(t)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-sky-600 hover:underline"
                                onClick={() => previewAsMerchant(t)}
                              >
                                Preview
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }}
          </QueryState>
        </>
      ) : (
        <QueryState query={untrackedQ}>
          {(data) => (
            <div className="platform-card p-4">
              <p className="mb-4 text-sm text-slate-600">
                Stores without a catalog theme id, or using an unknown / unpublished theme.
              </p>
              <button
                type="button"
                className="mb-4 text-sm text-sky-600 hover:underline"
                onClick={() =>
                  setDrawer({
                    title: "Custom / untracked stores",
                    stores: data.stores as ThemeStore[],
                  })
                }
              >
                Open full list ({(data.stores as ThemeStore[]).length})
              </button>
              <ul className="divide-y text-sm">
                {(data.stores as ThemeStore[]).slice(0, 20).map((s) => (
                  <li key={s.tenantId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to={`/tenants/${s.tenantId}`} className="font-medium text-sky-600">
                        {s.tenantName}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-slate-500">
                        {s.catalogThemeId ?? "—"}
                      </span>
                    </div>
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) {
                          api.assignThemeToStore(s.tenantId, v).then(() => invalidate());
                        }
                      }}
                    >
                      <option value="">Assign…</option>
                      {themesForAssign
                        .filter((t) => t.published)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </QueryState>
      )}

      {editTheme ? (
        <EditThemeModal
          theme={editTheme}
          onClose={() => setEditTheme(null)}
          onSaved={() => invalidate()}
        />
      ) : null}

      {drawer ? (
        <StoresDrawer
          title={drawer.title}
          stores={drawer.stores}
          themes={themesForAssign}
          onClose={() => setDrawer(null)}
          onAssign={(tenantId, themeId) =>
            api.assignThemeToStore(tenantId, themeId).then(() => {
              invalidate();
              setDrawer(null);
            })
          }
        />
      ) : null}
    </div>
  );
}
