import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function BlogPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data } = useQuery({
    queryKey: ["blog", tenant],
    queryFn: () => storeApi.blogPosts(tenant),
  });

  const posts = data?.posts ?? [];

  return (
    <>
      <h1 className="text-3xl font-bold">Blog</h1>
      {posts.length === 0 ? (
        <p className="mt-8 text-zinc-500">No posts yet.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.slug} className="store-card p-6">
              <Link to={storeHref(`/blog/${p.slug}`, nav)}>
                <h2 className="text-xl font-semibold hover:text-[var(--store-primary)]">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                  {p.body.replace(/<[^>]+>/g, "").slice(0, 120)}
                  {p.body.length > 120 ? "…" : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
