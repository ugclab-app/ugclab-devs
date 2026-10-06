import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { api } from "@/api/client";
import { InlineEdit } from "./inline-edit";

type PreviewProduct = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  priceAmount?: number;
  thumbUrl?: string | null;
  images?: { url?: string }[];
};

function defaultTitle(type: HomeBlock["type"]) {
  if (type === "new_arrivals") return "New arrivals";
  if (type === "sale") return "On sale";
  return "Catalog";
}

function useCatalogPreviewProducts(block: HomeBlock) {
  const cols = Math.min(4, Math.max(2, block.productColumns ?? 4));
  const limit = Math.min(12, Math.max(1, block.productLimit ?? cols));

  const query = useQuery({
    queryKey: ["products", "builder-preview", block.type, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(Math.max(limit, 12)),
        sort: "newest",
      });
      return api.products(params);
    },
    staleTime: 30_000,
  });

  const all = (query.data?.products ?? []) as PreviewProduct[];
  const active = all.filter((p) => !p.status || p.status === "ACTIVE");
  const products = (active.length ? active : all).slice(0, limit);

  return {
    products,
    currency: query.data?.currency ?? "USD",
    isLoading: query.isLoading,
    cols,
    limit,
  };
}

export function CatalogProductsInspector({
  block,
  selectedProductId,
  onSelectProduct,
}: {
  block: HomeBlock;
  selectedProductId?: string | null;
  onSelectProduct?: (product: { id: string; slug: string }) => void;
}) {
  const { products, currency, isLoading } = useCatalogPreviewProducts(block);

  return (
    <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
      <legend className="px-1 text-xs font-semibold text-zinc-500">Products</legend>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Click a product to open the Product page editor (sections, images, text).
      </p>
      {isLoading ? (
        <p className="text-xs text-zinc-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-xs text-zinc-500">No products yet.</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {products.map((p) => {
            const img = p.thumbUrl || p.images?.[0]?.url || null;
            const active = selectedProductId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    onSelectProduct?.({ id: p.id, slug: p.slug ?? "" })
                  }
                  className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition ${
                    active
                      ? "bg-violet-100 ring-1 ring-violet-300"
                      : "hover:bg-violet-50"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-zinc-400">—</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-zinc-900">
                      {p.title}
                    </span>
                    {typeof p.priceAmount === "number" ? (
                      <span className="text-[10px] text-zinc-500">
                        {formatMoney(p.priceAmount, currency)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-violet-600">
                    Edit
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/products/new"
          className="text-xs font-semibold text-violet-600 hover:underline"
        >
          + Add product
        </Link>
        <Link to="/products" className="text-xs text-zinc-500 hover:underline">
          All products
        </Link>
      </div>
    </fieldset>
  );
}

export function ProductsBlockPreview({
  block,
  onPatch,
  selectedProductId,
  onSelectProduct,
}: {
  block: HomeBlock;
  onPatch?: (patch: Partial<HomeBlock>) => void;
  selectedProductId?: string | null;
  onSelectProduct?: (product: { id: string; slug: string }) => void;
}) {
  const { products, currency, isLoading, cols } = useCatalogPreviewProducts(block);

  const gridClass =
    cols === 2
      ? "grid-cols-2"
      : cols === 3
        ? "grid-cols-3"
        : "grid-cols-4";

  return (
    <div className="rounded-lg bg-white p-4">
      <InlineEdit
        tag="h3"
        className="mb-3 block text-base font-bold text-zinc-900"
        value={block.title}
        placeholder={defaultTitle(block.type)}
        onChange={onPatch ? (title) => onPatch({ title }) : undefined}
      />

      {isLoading ? (
        <div className={`grid gap-2 ${gridClass}`}>
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-zinc-100"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          No products yet.{" "}
          <Link to="/products/new" className="font-semibold text-violet-600 hover:underline">
            Add a product
          </Link>
        </div>
      ) : (
        <ul className={`grid gap-2.5 ${gridClass}`}>
          {products.map((p) => {
            const img = p.thumbUrl || p.images?.[0]?.url || null;
            const price =
              typeof p.priceAmount === "number" ? p.priceAmount : null;
            const active = selectedProductId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct?.({ id: p.id, slug: p.slug ?? "" });
                  }}
                  className={`group/product block w-full overflow-hidden rounded-lg border bg-zinc-50 text-left transition ${
                    active
                      ? "border-sky-500 ring-2 ring-sky-400/40"
                      : "border-zinc-100 hover:border-violet-300 hover:ring-2 hover:ring-violet-200"
                  }`}
                  title={`Edit ${p.title}`}
                >
                  <div className="relative aspect-square bg-white">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-300">
                        No image
                      </div>
                    )}
                    <span
                      className={`absolute inset-x-0 bottom-0 bg-violet-600/95 py-1 text-center text-[10px] font-semibold text-white transition ${
                        active
                          ? "opacity-100"
                          : "opacity-0 group-hover/product:opacity-100"
                      }`}
                    >
                      {active ? "Open in editor →" : "Edit page"}
                    </span>
                  </div>
                  <div className="space-y-0.5 p-2">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-800">
                      {p.title}
                    </p>
                    {price != null ? (
                      <p className="text-[11px] font-semibold text-zinc-900">
                        {formatMoney(price, currency)}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-zinc-400">
        Click a product to open its page in the section editor
      </p>
    </div>
  );
}
