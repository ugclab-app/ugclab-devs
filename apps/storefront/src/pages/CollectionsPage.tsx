import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function CollectionsPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data } = useQuery({
    queryKey: ["collections", tenant],
    queryFn: () => storeApi.collections(tenant),
  });

  const collections = data?.collections ?? [];

  return (
    <>
      <h1 className="text-3xl font-bold">Collections</h1>
      {collections.length === 0 ? (
        <p className="mt-8 text-zinc-500">No collections yet.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.slug} className="store-card p-6">
              <Link to={storeHref(`/collections/${c.slug}`, nav)}>
                <h2 className="text-xl font-semibold hover:text-[var(--store-primary)]">
                  {c.title}
                </h2>
                {c.description ? (
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{c.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
