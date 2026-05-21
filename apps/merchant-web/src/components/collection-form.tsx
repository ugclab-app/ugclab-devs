import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormAlert } from "@/components/form-alert";
import { RichTextEditor } from "@/components/rich-text-editor";
import { StickyFormBar } from "@/components/sticky-form-bar";
import { AdminPageShell } from "@/components/admin-page-shell";
import { slugifyTitle } from "@/lib/slugify";
import { api } from "@/api/client";
import { getStorefrontUrl } from "@/lib/storefront";
import {
  parseStoreTheme,
  type HomeBlock,
  type StoreTheme,
} from "@ugclab/tenant/store-theme";

export type CollectionRuleType = "MANUAL" | "AUTO_TAG" | "AUTO_TYPE";

export type CollectionFormValues = {
  title: string;
  slug: string;
  description: string;
  ruleType: CollectionRuleType;
  ruleTag: string;
  ruleProductType: string;
  productIds: string[];
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroCta: string;
};

const RULE_LABELS: Record<CollectionRuleType, string> = {
  MANUAL: "Manual",
  AUTO_TAG: "By tag",
  AUTO_TYPE: "By product type",
};

const PRODUCT_TYPES = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
  { value: "SERVICE", label: "Service" },
] as const;

export function CollectionForm({
  mode,
  collectionId,
  initial,
  tenantSlug,
  onCreated,
}: {
  mode: "create" | "edit";
  collectionId?: string;
  initial: CollectionFormValues;
  tenantSlug?: string;
  onCreated?: (id: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [ruleType, setRuleType] = useState<CollectionRuleType>(initial.ruleType);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);
  const [productSearch, setProductSearch] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => api.products(new URLSearchParams({ limit: "500" })),
  });
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings(),
  });

  const products = (productsData?.products ?? []) as {
    id: string;
    title: string;
    status: string;
    type: string;
  }[];

  const draftTheme = parseStoreTheme(
    (settingsData as { themeDraft?: unknown } | undefined)?.themeDraft ??
      (settingsData as { theme?: unknown } | undefined)?.theme
  );

  useEffect(() => {
    if (!slugManual && mode === "create") {
      setSlug(slugifyTitle(title));
    }
  }, [title, slugManual, mode]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProducts = useMemo(
    () =>
      productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean) as typeof products,
    [productIds, products]
  );

  const storefrontUrl =
    tenantSlug && slug
      ? `${getStorefrontUrl(tenantSlug).replace(/\/?$/, "")}/collections/${slug}`
      : null;

  async function saveThemeExtras(collectionSlug: string, fd: FormData) {
    const heroTitle = String(fd.get("heroTitle") ?? "").trim();
    const heroSubtitle = String(fd.get("heroSubtitle") ?? "").trim();
    const heroImageUrl = String(fd.get("heroImageUrl") ?? "").trim();
    const heroCta = String(fd.get("heroCta") ?? "").trim();
    const seoTitle = String(fd.get("seoTitle") ?? "").trim();
    const seoDescription = String(fd.get("seoDescription") ?? "").trim();

    const block: HomeBlock = {
      id: draftTheme.collectionHeroes?.[collectionSlug]?.id ?? `hero_${collectionSlug}`,
      type: "hero",
      contentWidth: "full",
      paddingY: "none",
      title: heroTitle || title,
      subtitle: heroSubtitle || undefined,
      imageUrl: heroImageUrl || undefined,
      ctaLabel: heroCta || "Shop collection",
      ctaPath: `/collections/${collectionSlug}`,
    };

    const collectionSeo = { ...(draftTheme.collectionSeo ?? {}) };
    if (seoTitle || seoDescription) {
      collectionSeo[collectionSlug] = {
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
      };
    } else {
      delete collectionSeo[collectionSlug];
    }

    const nextTheme: StoreTheme = {
      ...draftTheme,
      collectionHeroes: {
        ...(draftTheme.collectionHeroes ?? {}),
        [collectionSlug]: block,
      },
      collectionSeo,
    };

    await api.updateSettings({ themeDraft: nextTheme });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      slug: String(fd.get("slug") ?? "").trim(),
      description: String(fd.get("description") ?? "") || null,
      ruleType,
      ruleTag: String(fd.get("ruleTag") ?? "").trim(),
      ruleProductType: String(fd.get("ruleProductType") ?? ""),
      productIds: ruleType === "MANUAL" ? productIds : undefined,
    };
    try {
      if (mode === "create") {
        const res = (await api.createCollection(payload)) as {
          collection: { id: string; slug: string };
        };
        await saveThemeExtras(res.collection.slug, fd);
        onCreated?.(res.collection.id);
        setAlert({ ok: true, message: "Collection created" });
      } else if (collectionId) {
        await api.updateCollection(collectionId, payload);
        await saveThemeExtras(payload.slug, fd);
        setAlert({ ok: true, message: "Collection saved" });
        await queryClient.invalidateQueries({ queryKey: ["collections"] });
        await queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      }
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setPending(false);
    }
  }

  function toggleProduct(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllVisible() {
    const visibleIds = filteredProducts.map((p) => p.id);
    setProductIds((prev) => [...new Set([...prev, ...visibleIds])]);
  }

  function clearSelection() {
    setProductIds([]);
  }

  function moveProduct(id: string, dir: -1 | 1) {
    setProductIds((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  return (
    <AdminPageShell
      crumbs={[
        { label: "Collections", to: "/collections" },
        { label: mode === "create" ? "New collection" : title || "Edit" },
      ]}
      title={mode === "create" ? "New collection" : title || "Edit collection"}
      description="Group products for your storefront. Manual collections let you pick and order products."
      actions={
        storefrontUrl ? (
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            View on storefront
          </a>
        ) : null
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="grid gap-6 pb-28 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <section className="admin-card space-y-4 p-6">
            <h2 className="font-semibold text-zinc-900">Details</h2>
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="ugclab-input mt-1.5 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">URL slug</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setSlug(e.target.value);
                  }}
                  className="ugclab-input flex-1 font-mono"
                />
                <button
                  type="button"
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  onClick={() => {
                    setSlugManual(false);
                    setSlug(slugifyTitle(title));
                  }}
                >
                  Auto
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Shown on the collection page and used for SEO when no custom meta is set.
              </p>
              <div className="mt-1.5">
                <RichTextEditor
                  name="description"
                  defaultValue={initial.description}
                  placeholder="Tell shoppers what this collection is about…"
                />
              </div>
            </div>
          </section>

          <section className="admin-card space-y-4 p-6">
            <h2 className="font-semibold text-zinc-900">Products</h2>
            <div>
              <label className="block text-sm font-medium">Rule type</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as CollectionRuleType)}
                className="ugclab-input mt-1.5 w-full"
              >
                {(Object.keys(RULE_LABELS) as CollectionRuleType[]).map((k) => (
                  <option key={k} value={k}>
                    {RULE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {ruleType === "AUTO_TAG" ? (
              <div>
                <label className="block text-sm font-medium">Product tag</label>
                <input
                  name="ruleTag"
                  defaultValue={initial.ruleTag}
                  placeholder="e.g. summer"
                  className="ugclab-input mt-1.5 w-full"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Active products with this tag appear automatically.
                </p>
              </div>
            ) : null}
            {ruleType === "AUTO_TYPE" ? (
              <div>
                <label className="block text-sm font-medium">Product type</label>
                <select
                  name="ruleProductType"
                  defaultValue={initial.ruleProductType || "PHYSICAL"}
                  className="ugclab-input mt-1.5 w-full"
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {ruleType === "MANUAL" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="ugclab-input min-w-[200px] flex-1 text-sm"
                  />
                  <button
                    type="button"
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    onClick={selectAllVisible}
                  >
                    Select visible
                  </button>
                  <button
                    type="button"
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {filteredProducts.length === 0 ? (
                    <li className="px-2 py-3 text-sm text-zinc-500">No products match.</li>
                  ) : (
                    filteredProducts.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50">
                          <input
                            type="checkbox"
                            checked={productIds.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                          />
                          <span className="flex-1">{p.title}</span>
                          <span className="text-xs text-zinc-400">{p.status}</span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
                {selectedProducts.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-zinc-700">
                      Order on storefront ({selectedProducts.length})
                    </p>
                    <ol className="mt-2 space-y-1 rounded-lg border border-zinc-200 p-2">
                      {selectedProducts.map((p, idx) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 rounded bg-zinc-50 px-2 py-1.5 text-sm"
                        >
                          <span className="flex-1 truncate">{p.title}</span>
                          <button
                            type="button"
                            disabled={idx === 0}
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs disabled:opacity-40"
                            onClick={() => moveProduct(p.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedProducts.length - 1}
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs disabled:opacity-40"
                            onClick={() => moveProduct(p.id, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => toggleProduct(p.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Products are chosen automatically by the rule above.
              </p>
            )}
          </section>

          <section className="admin-card space-y-4 p-6">
            <h2 className="font-semibold text-zinc-900">Collection hero</h2>
            <p className="text-sm text-zinc-500">
              Banner at the top of the collection page (saved to theme draft).
            </p>
            <input
              name="heroTitle"
              defaultValue={initial.heroTitle}
              placeholder="Hero title"
              className="ugclab-input w-full"
            />
            <input
              name="heroSubtitle"
              defaultValue={initial.heroSubtitle}
              placeholder="Subtitle"
              className="ugclab-input w-full"
            />
            <input
              name="heroImageUrl"
              defaultValue={initial.heroImageUrl}
              placeholder="Banner image URL"
              className="ugclab-input w-full font-mono text-sm"
            />
            <input
              name="heroCta"
              defaultValue={initial.heroCta}
              placeholder="Button label"
              className="ugclab-input w-full"
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="admin-card space-y-3 p-5">
            <h2 className="font-semibold text-zinc-900">Search engine</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Meta title</label>
              <input
                name="seoTitle"
                defaultValue={initial.seoTitle}
                placeholder={title || "Collection title"}
                className="ugclab-input mt-1 w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Meta description
              </label>
              <textarea
                name="seoDescription"
                defaultValue={initial.seoDescription}
                rows={3}
                className="ugclab-input mt-1 w-full text-sm"
                placeholder="Optional override for search snippets"
              />
            </div>
          </section>
          {mode === "edit" && collectionId ? (
            <section className="admin-card p-5 text-sm text-zinc-600">
              <Link
                to="/collections"
                className="font-medium text-violet-600 hover:underline"
              >
                ← Back to collections
              </Link>
            </section>
          ) : null}
        </aside>

        <StickyFormBar
          discardTo="/collections"
          submitLabel={mode === "create" ? "Create collection" : "Save changes"}
          pending={pending}
        />
      </form>
    </AdminPageShell>
  );
}
