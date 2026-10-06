import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { getStorefrontUrl } from "@/lib/storefront";

type Row = {
  id: string;
  title: string;
  slug: string;
  priceAmount?: number;
  thumbUrl?: string | null;
  status?: string;
};

/**
 * Product page template editor chrome — shows the fixed PDP (title/media/price)
 * which is edited in Products, plus link into that product.
 */
export function ProductPageEditorChrome({
  tenantSlug,
  previewProductSlug,
  onPickProduct,
}: {
  tenantSlug: string;
  previewProductSlug?: string | null;
  onPickProduct?: (slug: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["products", "product-page-editor"],
    queryFn: () =>
      api.products(new URLSearchParams({ limit: "50", sort: "newest" })),
    staleTime: 30_000,
  });

  const currency = data?.currency ?? "USD";
  const products = (data?.products ?? []) as Row[];
  const active = products.filter((p) => !p.status || p.status === "ACTIVE");
  const list = active.length ? active : products;
  const selected =
    list.find((p) => p.slug === previewProductSlug) ?? list[0] ?? null;

  const storeUrl = selected
    ? (() => {
        const base = getStorefrontUrl(tenantSlug);
        const u = new URL(base);
        u.pathname = `/products/${selected.slug}`;
        u.searchParams.set("preview", "1");
        return u.toString();
      })()
    : null;

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Product page template</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            Title, photos, price, and description come from the{" "}
            <strong>product</strong>. Blocks below are shared sections on every product page
            (like Shopify’s product template).
          </p>
        </div>
        {selected ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/products/${selected.id}/edit`}
              className="ugclab-btn ugclab-btn-primary px-3 py-1.5 text-xs"
            >
              Edit this product
            </Link>
            {storeUrl ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="ugclab-btn border border-zinc-200 bg-white px-3 py-1.5 text-xs"
              >
                Preview product ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {list.length > 0 ? (
        <label className="block text-xs text-zinc-600">
          Preview as product
          <select
            className="ugclab-select mt-1 max-w-md text-sm"
            value={selected?.slug ?? ""}
            onChange={(e) => onPickProduct?.(e.target.value)}
          >
            {list.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-zinc-500">
          No products yet.{" "}
          <Link to="/products/new" className="font-semibold text-violet-600">
            Add a product
          </Link>
        </p>
      )}

      {selected ? (
        <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-[7rem_1fr]">
          <div className="aspect-square overflow-hidden rounded-md bg-zinc-50">
            {selected.thumbUrl ? (
              <img
                src={selected.thumbUrl}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">{selected.title}</p>
            {typeof selected.priceAmount === "number" ? (
              <p className="mt-1 text-sm font-bold text-zinc-800">
                {formatMoney(selected.priceAmount, currency)}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-zinc-500">
              This card is read-only here — use{" "}
              <Link
                to={`/products/${selected.id}/edit`}
                className="font-semibold text-violet-600 hover:underline"
              >
                Edit this product
              </Link>{" "}
              to change photos, title, or description. Scroll down to add sections under the buy box.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
