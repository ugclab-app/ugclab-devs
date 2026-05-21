import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function LowStockPanel() {
  const { data } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => api.lowStockProducts(),
  });

  const products = (data?.products ?? []) as {
    id: string;
    title: string;
    inventory: number | null;
    images?: { url: string }[];
  }[];
  const threshold = (data as { threshold?: number })?.threshold ?? 5;

  return (
    <section className="admin-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">
          Low stock
          {products.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-red-600">
              ({products.length})
            </span>
          ) : null}
        </h2>
        <Link to="/products" className="text-sm font-medium text-violet-600">
          All products
        </Link>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Alert when inventory ≤ {threshold} units
      </p>
      {products.length === 0 ? (
        <p className="mt-4 text-sm text-emerald-700">All products above threshold.</p>
      ) : (
      <ul className="mt-4 space-y-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              to={`/products/${p.id}/edit`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50"
            >
              {p.images?.[0]?.url ? (
                <img
                  src={p.images[0].url}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                  —
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.title}
              </span>
              <span className="text-sm font-semibold text-red-600">
                {p.inventory} left
              </span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
