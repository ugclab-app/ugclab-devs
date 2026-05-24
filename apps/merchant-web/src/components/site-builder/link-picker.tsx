import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function LinkPathField({
  value,
  onChange,
  label = "Link",
}: {
  value: string;
  onChange: (path: string) => void;
  label?: string;
}) {
  const { data: collectionsData } = useQuery({
    queryKey: ["collections", "link-picker"],
    queryFn: () => api.collections(),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products", "link-picker"],
    queryFn: () => api.products(new URLSearchParams({ limit: "100" })),
  });
  const { data: pagesData } = useQuery({
    queryKey: ["pages", "link-picker"],
    queryFn: () => api.pages(),
  });

  const collections = (collectionsData?.collections ?? []) as Array<{
    slug: string;
    title: string;
  }>;
  const products = (productsData?.products ?? []) as Array<{ slug: string; title: string }>;
  const pages = (pagesData?.pages ?? []) as Array<{ slug: string; title: string }>;

  return (
    <label className="block text-xs">
      {label}
      <div className="mt-1 space-y-1.5">
        <input
          className="ugclab-input font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/collections or /products/slug"
        />
        <select
          className="ugclab-select text-xs"
          value=""
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        >
          <option value="">Pick link…</option>
          <optgroup label="Shop">
            <option value="/collections">All collections</option>
            {collections.map((c) => (
              <option key={c.slug} value={`/collections/${c.slug}`}>
                Collection: {c.title}
              </option>
            ))}
            {products.map((p) => (
              <option key={p.slug} value={`/products/${p.slug}`}>
                Product: {p.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Pages">
            {pages.map((p) => (
              <option key={p.slug} value={`/pages/${p.slug}`}>
                {p.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other">
            <option value="/cart">Cart</option>
            <option value="/checkout">Checkout</option>
            <option value="/blog">Blog</option>
          </optgroup>
        </select>
      </div>
    </label>
  );
}
