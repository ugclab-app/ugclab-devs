import { useMemo, useState } from "react";

const PREVIEW_PAGES = [
  { id: "home", label: "Home", path: "" },
  { id: "cart", label: "Cart", path: "/cart" },
  { id: "checkout", label: "Checkout", path: "/checkout" },
  { id: "product", label: "Product", path: "/products/__slug__" },
] as const;

export function StorefrontPreview({
  baseUrl,
  productSlug,
}: {
  baseUrl: string;
  productSlug?: string | null;
}) {
  const [page, setPage] = useState<(typeof PREVIEW_PAGES)[number]["id"]>("home");
  const [loaded, setLoaded] = useState(true);

  const url = useMemo(() => {
    const u = new URL(baseUrl);
    const item = PREVIEW_PAGES.find((p) => p.id === page) ?? PREVIEW_PAGES[0];
    let path: string = item.path;
    if (path.includes("__slug__")) {
      path = productSlug ? `/products/${productSlug}` : "";
    }
    u.pathname = path || "/";
    if (!u.searchParams.has("preview")) u.searchParams.set("preview", "1");
    return u.toString();
  }, [baseUrl, page, productSlug]);

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Live preview</h2>
          <p className="text-xs text-zinc-500">Draft theme · save to refresh</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ugclab-btn border border-zinc-200 bg-white text-xs"
        >
          Open ↗
        </a>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-zinc-100 bg-white px-3 py-2">
        {PREVIEW_PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(p.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              page === p.id
                ? "bg-violet-100 text-violet-800"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="bg-zinc-100 p-3">
        {loaded ? (
          <iframe
            key={url}
            src={url}
            title="Storefront preview"
            className="h-[420px] w-full rounded-lg border border-zinc-200 bg-white shadow-inner"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-600"
          >
            Load preview
          </button>
        )}
      </div>
      {page === "product" && !productSlug ? (
        <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50">
          Add a published product to preview the product page.
        </p>
      ) : null}
    </section>
  );
}
