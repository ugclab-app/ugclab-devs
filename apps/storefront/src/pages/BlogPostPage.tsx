import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useStoreParams();

  const { data, isError } = useQuery({
    queryKey: ["blog-post", tenant, slug],
    queryFn: () => storeApi.blogPost(tenant, slug!),
    enabled: !!slug,
  });

  if (isError) return <p className="text-zinc-500">Post not found.</p>;
  if (!data) return <p className="text-zinc-500">Loading…</p>;

  return (
    <article className="prose prose-zinc max-w-3xl">
      <h1 className="text-3xl font-bold">{data.post.title}</h1>
      <div
        className="mt-8 prose-zinc"
        dangerouslySetInnerHTML={{ __html: data.post.body }}
      />
    </article>
  );
}
