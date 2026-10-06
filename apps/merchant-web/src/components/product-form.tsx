import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FormAlert } from "@/components/form-alert";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RichTextEditor } from "@/components/rich-text-editor";
import { FileDropzone } from "@/components/file-dropzone";
import { ProductMediaField } from "@/components/product-media-field";
import {
  ProductVariantsEditor,
  type VariantRow,
} from "@/components/product-variants-editor";
import {
  ProductTranslationsFields,
  type ProductTranslations,
} from "@/components/product-translations-fields";
import { slugifyTitle } from "@/lib/slugify";
import { StickyFormBar } from "@/components/sticky-form-bar";
import { api } from "@/api/client";
import { getStorefrontUrl } from "@/lib/storefront";
import type { ProductStatus, ProductType } from "@/lib/database-types";

export type ProductFormExtras = {
  pendingImages: File[];
};

export type ProductFormValues = {
  title: string;
  slug: string;
  description: string;
  type: ProductType;
  status: ProductStatus;
  price: string;
  compareAt: string;
  inventory: string;
  sku?: string;
  tags?: string;
  weightGrams?: string;
  barcode?: string;
  requiresShipping?: boolean;
  hsCode?: string;
  countryOfOrigin?: string;
  seoTitle?: string;
  seoDescription?: string;
  sizeChart?: string;
  countryPrices?: string;
  collectionIds?: string[];
  publishAt?: string;
  costAmount?: string;
  digitalFileName?: string | null;
  digitalFileSize?: number | null;
  downloadLimit?: number;
  variants?: VariantRow[];
  translations?: ProductTranslations;
};

type WeightUnit = "g" | "kg" | "lb" | "oz";

const ORIGIN_COUNTRIES: { code: string; label: string }[] = [
  { code: "", label: "Select country/region" },
  { code: "KG", label: "Kyrgyzstan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "UZ", label: "Uzbekistan" },
  { code: "TJ", label: "Tajikistan" },
  { code: "TM", label: "Turkmenistan" },
  { code: "RU", label: "Russia" },
  { code: "BY", label: "Belarus" },
  { code: "UA", label: "Ukraine" },
  { code: "TR", label: "Turkey" },
  { code: "CN", label: "China" },
  { code: "IN", label: "India" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PL", label: "Poland" },
  { code: "NL", label: "Netherlands" },
  { code: "KR", label: "South Korea" },
  { code: "JP", label: "Japan" },
  { code: "VN", label: "Vietnam" },
  { code: "BD", label: "Bangladesh" },
  { code: "PK", label: "Pakistan" },
];

function gramsToDisplay(grams: number, unit: WeightUnit): number {
  if (unit === "kg") return grams / 1000;
  if (unit === "lb") return grams / 453.59237;
  if (unit === "oz") return grams / 28.349523125;
  return grams;
}

function displayToGrams(value: number, unit: WeightUnit): number {
  if (unit === "kg") return Math.round(value * 1000);
  if (unit === "lb") return Math.round(value * 453.59237);
  if (unit === "oz") return Math.round(value * 28.349523125);
  return Math.round(value);
}

export function ProductForm({
  onSubmit,
  initial,
  submitLabel,
  currency,
  enabledLocales = ["en"],
  mode,
  productId,
  images = [],
  tenantSlug,
}: {
  onSubmit: (
    form: FormData,
    extras: ProductFormExtras
  ) => Promise<{ ok: boolean; message?: string }>;
  initial: ProductFormValues;
  submitLabel: string;
  currency: string;
  enabledLocales?: string[];
  mode: "create" | "edit";
  productId?: string;
  images?: { id: string; url: string; fileName: string; alt: string | null }[];
  tenantSlug?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [type, setType] = useState<ProductType>(initial.type);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>(
    initial.collectionIds ?? []
  );
  const [requiresShipping, setRequiresShipping] = useState(
    initial.requiresShipping ?? true
  );
  const initialGrams = Number(initial.weightGrams) || 0;
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    initialGrams >= 1000 ? "kg" : "g"
  );
  const [weightDisplay, setWeightDisplay] = useState(() => {
    if (!initial.weightGrams) return "";
    const g = Number(initial.weightGrams) || 0;
    const unit: WeightUnit = g >= 1000 ? "kg" : "g";
    const v = gramsToDisplay(g, unit);
    return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, "");
  });

  const { data: collectionsData } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.collections(),
  });
  const collections = (collectionsData?.collections ?? []) as {
    id: string;
    title: string;
  }[];

  useEffect(() => {
    if (!slugManual && mode === "create") {
      setSlug(slugifyTitle(title));
    }
  }, [title, slugManual, mode]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("collectionIds", JSON.stringify(collectionIds));
      if (type === "PHYSICAL") {
        fd.set("requiresShipping", requiresShipping ? "true" : "false");
        const parsed = parseFloat(weightDisplay);
        const grams =
          Number.isFinite(parsed) && parsed > 0
            ? displayToGrams(parsed, weightUnit)
            : 0;
        fd.set("weightGrams", String(grams || ""));
      }
      const result = await onSubmit(fd, { pendingImages });
      setAlert(result);
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  const previewUrl = (() => {
    if (!tenantSlug || !slug) return null;
    try {
      const url = new URL(getStorefrontUrl(tenantSlug));
      url.pathname = `/products/${slug}`;
      return url.toString();
    } catch {
      return null;
    }
  })();

  const translationsForLocales = { ...(initial.translations ?? {}) };
  delete (translationsForLocales as Record<string, unknown>)._seo;
  delete (translationsForLocales as Record<string, unknown>)._sizeChart;
  delete (translationsForLocales as Record<string, unknown>)._countryPrices;

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Breadcrumbs
        items={[
          { label: "Products", to: "/products" },
          {
            label: mode === "create" ? "Add new product" : initial.title || "Edit",
          },
        ]}
      />
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <FormAlert ok={alert.ok} message={alert.message} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProductMediaField
              productId={productId}
              images={images}
              pendingFiles={pendingImages}
              onPendingChange={setPendingImages}
            />

            <section className="admin-card space-y-5 p-6">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="ugclab-input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <div className="mt-1.5">
                  <RichTextEditor
                    name="description"
                    defaultValue={initial.description}
                    placeholder="Tell customers about this product…"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Size chart</label>
                <p className="mt-1 text-xs text-zinc-500">
                  One row per line. Separate columns with | — for example Size | Chest | Waist.
                </p>
                <textarea
                  name="sizeChart"
                  defaultValue={initial.sizeChart ?? ""}
                  rows={5}
                  className="ugclab-input mt-1.5 font-mono text-sm"
                  placeholder={"Size | Chest | Waist\nS | 36 | 28\nM | 38 | 30"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Prices by country</label>
                <p className="mt-1 text-xs text-zinc-500">
                  One price per line, in the store currency. Example: US=19.99 or DE:17.50. Buyers
                  in other countries see the regular price.
                </p>
                <textarea
                  name="countryPrices"
                  defaultValue={initial.countryPrices ?? ""}
                  rows={4}
                  className="ugclab-input mt-1.5 font-mono text-sm"
                  placeholder={"US=19.99\nDE=17.50"}
                />
              </div>
            </section>

            <section className="admin-card space-y-4 p-6">
              <h2 className="font-semibold text-zinc-900">Search engine listing</h2>
              <p className="text-xs text-zinc-500">
                Optional. Overrides the default product title in browser tabs and search.
              </p>
              <div>
                <label className="block text-sm font-medium">SEO title</label>
                <input
                  name="seoTitle"
                  defaultValue={initial.seoTitle ?? ""}
                  placeholder={title || "Product title"}
                  className="ugclab-input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">SEO description</label>
                <textarea
                  name="seoDescription"
                  defaultValue={initial.seoDescription ?? ""}
                  rows={2}
                  className="ugclab-input mt-1.5"
                  placeholder="Short summary for Google and social previews"
                />
              </div>
            </section>

            <ProductVariantsEditor initial={initial.variants ?? []} onChange={() => {}} />
            <ProductTranslationsFields
              enabledLocales={enabledLocales}
              initial={translationsForLocales}
            />
          </div>

          <aside className="space-y-6">
            <section className="admin-card space-y-4 p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Status</h2>
              <select
                name="status"
                defaultValue={initial.status}
                className="ugclab-select w-full"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-sm font-medium text-violet-600 hover:underline"
                >
                  Preview on storefront
                </a>
              ) : null}
            </section>

            <section className="admin-card space-y-4 p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Product type</h2>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="ugclab-select w-full"
              >
                <option value="PHYSICAL">Physical</option>
                <option value="DIGITAL">Digital</option>
                <option value="SERVICE">Service</option>
              </select>
            </section>

            <section className="admin-card space-y-4 p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Pricing</h2>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  Price ({currency})
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={initial.price}
                  required
                  className="ugclab-input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  Compare-at
                </label>
                <input
                  name="compareAt"
                  type="number"
                  step="0.01"
                  defaultValue={initial.compareAt}
                  className="ugclab-input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  Cost ({currency})
                </label>
                <input
                  name="costAmount"
                  type="number"
                  step="0.01"
                  defaultValue={initial.costAmount ?? ""}
                  placeholder="For margin in reports"
                  className="ugclab-input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  Schedule publish
                </label>
                <input
                  name="publishAt"
                  type="datetime-local"
                  defaultValue={initial.publishAt ?? ""}
                  className="ugclab-input mt-1 w-full"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Future date keeps product as draft until then.
                </p>
              </div>
            </section>

            {type === "PHYSICAL" ? (
              <section className="admin-card space-y-4 p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Inventory</h2>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">
                    Quantity
                  </label>
                  <input
                    name="inventory"
                    type="number"
                    defaultValue={initial.inventory}
                    className="ugclab-input mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">
                    Barcode
                  </label>
                  <input
                    name="barcode"
                    defaultValue={initial.barcode ?? ""}
                    className="ugclab-input mt-1 w-full font-mono text-sm"
                  />
                </div>
              </section>
            ) : null}

            {type === "PHYSICAL" ? (
              <section className="admin-card space-y-5 p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Shipping</h2>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={requiresShipping}
                    onChange={(e) => setRequiresShipping(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900">
                      This is a physical product
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Customers will be charged shipping at checkout when enabled
                    </span>
                  </span>
                </label>

                {requiresShipping ? (
                  <div className="space-y-5 border-t border-zinc-100 pt-5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600">
                        Package weight
                      </label>
                      <div className="mt-1.5 inline-flex max-w-full overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={weightDisplay}
                          onChange={(e) => setWeightDisplay(e.target.value)}
                          placeholder="0.0"
                          className="w-28 min-w-0 border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                        />
                        <select
                          value={weightUnit}
                          onChange={(e) => {
                            const next = e.target.value as WeightUnit;
                            const current = parseFloat(weightDisplay);
                            if (
                              Number.isFinite(current) &&
                              weightDisplay !== ""
                            ) {
                              const grams = displayToGrams(current, weightUnit);
                              const converted = gramsToDisplay(grams, next);
                              setWeightDisplay(
                                Number.isInteger(converted)
                                  ? String(converted)
                                  : converted
                                      .toFixed(3)
                                      .replace(/\.?0+$/, "")
                              );
                            }
                            setWeightUnit(next);
                          }}
                          className="w-[4.5rem] shrink-0 cursor-pointer border-0 border-l border-zinc-200 bg-zinc-50 px-2 py-2.5 text-sm text-zinc-800 outline-none"
                          aria-label="Weight unit"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                        </select>
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-500">
                        Used to calculate shipping rates
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          Customs information
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          Used for international shipping labels and duties
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600">
                          Country/region of origin
                        </label>
                        <select
                          name="countryOfOrigin"
                          defaultValue={initial.countryOfOrigin ?? ""}
                          className="ugclab-input mt-1.5 w-full"
                        >
                          {ORIGIN_COUNTRIES.map((c) => (
                            <option key={c.code || "none"} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600">
                          Harmonized System (HS) code
                        </label>
                        <input
                          name="hsCode"
                          defaultValue={initial.hsCode ?? ""}
                          placeholder="e.g. 6302.60"
                          className="ugclab-input mt-1.5 w-full font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {type === "DIGITAL" ? (
              <section className="admin-card space-y-4 p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Digital file</h2>
                {initial.digitalFileName ? (
                  <p className="text-xs text-zinc-500">
                    Current: {initial.digitalFileName}
                  </p>
                ) : null}
                <FileDropzone
                  name="digitalFile"
                  accept="*/*"
                  hint="PDF, ZIP, video, etc."
                  currentLabel={initial.digitalFileName}
                />
                <div>
                  <label className="block text-xs font-medium text-zinc-600">
                    Download limit
                  </label>
                  <input
                    name="downloadLimit"
                    type="number"
                    min={1}
                    defaultValue={initial.downloadLimit ?? 5}
                    className="ugclab-input mt-1 w-full"
                  />
                </div>
              </section>
            ) : null}

            {type === "SERVICE" ? (
              <section className="admin-card p-5">
                <p className="text-xs text-zinc-500">
                  Services have no inventory or shipping. Set price and description only.
                </p>
              </section>
            ) : null}

            <section className="admin-card space-y-3 p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Organization</h2>
              <div>
                <label className="block text-xs font-medium text-zinc-600">SKU</label>
                <input
                  name="sku"
                  defaultValue={initial.sku ?? ""}
                  className="ugclab-input mt-1 w-full font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  Tags (comma-separated)
                </label>
                <input
                  name="tags"
                  defaultValue={initial.tags ?? ""}
                  placeholder="sale, summer"
                  className="ugclab-input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  URL slug
                </label>
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManual(true);
                  }}
                  required
                  className="ugclab-input mt-1 w-full font-mono text-sm"
                />
                {mode === "create" ? (
                  <button
                    type="button"
                    className="mt-1 text-xs text-violet-600 hover:underline"
                    onClick={() => {
                      setSlugManual(false);
                      setSlug(slugifyTitle(title));
                    }}
                  >
                    Reset from title
                  </button>
                ) : null}
              </div>
              {collections.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-zinc-600 mb-2">Collections</p>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {collections.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={collectionIds.includes(col.id)}
                          onChange={(e) => {
                            setCollectionIds((prev) =>
                              e.target.checked
                                ? [...prev, col.id]
                                : prev.filter((id) => id !== col.id)
                            );
                          }}
                          className="rounded border-zinc-300"
                        />
                        {col.title}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  <Link to="/collections" className="text-violet-600 hover:underline">
                    Create a collection
                  </Link>{" "}
                  to group products.
                </p>
              )}
            </section>
          </aside>
        </div>

        <StickyFormBar discardTo="/products" submitLabel={submitLabel} pending={pending} />
      </form>
    </div>
  );
}
