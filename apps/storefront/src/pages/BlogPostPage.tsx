import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";

export function BlogPostPage() {
  const ctx = useStore();
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useStoreParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "1";

  const { data, isError } = useQuery({
    queryKey: ["blog-post", tenant, slug, preview],
    queryFn: () => storeApi.blogPost(tenant, slug!, preview),
    enabled: !!slug,
  });

  const post = data?.post;
  useDocumentSeo({
    title: buildStoreTitle(
      (ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name,
      post?.seoTitle ?? post?.title
    ),
    description: post?.seoDescription ?? post?.excerpt ?? undefined,
    image: post?.ogImageUrl ?? post?.featuredImageUrl ?? ctx.logoUrl,
    type: "article",
    noindex: post?.noindex,
    canonicalUrl: post?.canonicalUrl,
  });

  if (isError) return <p className="text-zinc-500">Post not found.</p>;
  if (!post) return <p className="text-zinc-500">Loading…</p>;

  return (
    <article className="prose prose-zinc max-w-3xl">
      {post.featuredImageUrl ? (
        <img
          src={post.featuredImageUrl}
          alt=""
          className="mb-8 w-full rounded-xl object-cover max-h-80"
        />
      ) : null}
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        {post.authorName ? `${post.authorName} · ` : ""}
        {new Date(post.publishedAt).toLocaleDateString()}
      </p>
      {post.tags.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5">
              #{t}
            </span>
          ))}
        </p>
      ) : null}
      <div
        className="mt-8 prose-zinc"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />
    </article>
  );
}
