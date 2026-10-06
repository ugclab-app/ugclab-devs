import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { Link } from "react-router-dom";

export function BoughtTogether({ productId }: { productId: string }) {
  const { tenant, locale } = useStoreParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["bundles", tenant],
    queryFn: () => storeApi.bundles(tenant),
  });
  const add = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => storeApi.addToCart(tenant, { productId: id, quantity: 1 }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["store-context"] });
    },
  });

  const matches = (data?.bundles ?? []).filter((b) =>
    b.items.some((i) => i.product.id === productId)
  );
  if (matches.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">Frequently bought together</h2>
      <div className="mt-4 space-y-4">
        {matches.map((bundle) => {
          const others = bundle.items.filter((i) => i.product.id !== productId);
          const ids = bundle.items.map((i) => i.product.id);
          return (
            <div key={bundle.id} className="rounded-xl border border-zinc-200 p-4">
              <p className="font-medium">{bundle.title}</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {others.map((item) => (
                  <li key={item.product.id}>
                    <Link
                      to={storeHref(`/products/${item.product.slug}`, { locale, tenant })}
                      className="text-sm text-violet-700 hover:underline"
                    >
                      {item.product.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={add.isPending}
                onClick={() => add.mutate(ids)}
                className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Add set to cart
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
