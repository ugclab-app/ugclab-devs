import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMessages } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { readRecentProductIds } from "@/hooks/use-recently-viewed";
import { ProductCard } from "@/components/product-card";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";

export function RecentlyViewedSection({ excludeId }: { excludeId?: string }) {
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const [ids, setIds] = useState(() =>
    readRecentProductIds(ctx.tenant.id).filter((id) => id !== excludeId)
  );

  useEffect(() => {
    const refresh = () =>
      setIds(readRecentProductIds(ctx.tenant.id).filter((id) => id !== excludeId));
    window.addEventListener("ugclab-recent-updated", refresh);
    return () => window.removeEventListener("ugclab-recent-updated", refresh);
  }, [ctx.tenant.id, excludeId]);

  const { data } = useQuery({
    queryKey: ["recent-products", tenant, locale, ids.join(",")],
    queryFn: () => storeApi.recentProducts(tenant, ids, locale),
    enabled: ids.length > 0,
  });

  const products = data?.products ?? [];
  if (products.length === 0) return null;

  const sf = getMessages().storefront;

  return (
    <section className="mt-12 border-t border-zinc-200 pt-10">
      <h2 className="text-2xl font-bold text-zinc-900">Recently viewed</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            {...productCardProps(p, {
              currency: data?.currency ?? ctx.currency,
              typeLabel: productTypeLabel(p.type),
              locale: ctx.locale,
              tenantSlug: ctx.tenant.slug,
            })}
          />
        ))}
      </ul>
    </section>
  );
}
