import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
];

export function BlogPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const [params, setParams] = useSearchParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const sort = params.get("sort") ?? "newest";
  const tag = params.get("tag") ?? undefined;

  const { data } = useQuery({
    queryKey: ["blog", tenant, sort, tag],
    queryFn: () => storeApi.blogPosts(tenant, { sort, tag }),
  });

  const posts = data?.posts ?? [];
  const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Blog</h1>
        <a
          href={storeApi.blogRssUrl(tenant)}
          className="text-sm text-[var(--store-primary)] hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          RSS feed
        </a>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-600">
          Sort{" "}
          <select
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("sort", e.target.value);
              setParams(next);
            }}
            className="ml-1 rounded border border-zinc-200 px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams())}
              className={`rounded-full px-3 py-1 text-xs ${
                !tag ? "bg-[var(--store-primary)] text-white" : "bg-zinc-100"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("tag", t);
                  setParams(next);
                }}
                className={`rounded-full px-3 py-1 text-xs ${
                  tag === t
                    ? "bg-[var(--store-primary)] text-white"
                    : "bg-zinc-100"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 text-zinc-500">No posts yet.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.slug} className="store-card overflow-hidden p-0">
              <Link
                to={storeHref(`/blog/${p.slug}`, nav)}
                className="flex flex-col sm:flex-row"
              >
                {p.featuredImageUrl ? (
                  <img
                    src={p.featuredImageUrl}
                    alt=""
                    className="h-40 w-full object-cover sm:h-auto sm:w-48"
                  />
                ) : null}
                <div className="p-6">
                  <h2 className="text-xl font-semibold hover:text-[var(--store-primary)]">
                    {p.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-3">
                    {p.excerpt}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {p.authorName ? `${p.authorName} · ` : ""}
                    {new Date(p.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
