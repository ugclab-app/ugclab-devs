import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { buildStoreTitle, useDocumentSeo } from "@/hooks/use-document-seo";
import { StoreBlockRenderer } from "@/components/store-block-renderer";

export function CmsPage() {
  const ctx = useStore();
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useStoreParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "1";

  const { data, isError } = useQuery({
    queryKey: ["page", tenant, slug, preview],
    queryFn: () => storeApi.page(tenant, slug!, preview),
    enabled: !!slug,
  });

  const page = data?.page;
  useDocumentSeo({
    title: buildStoreTitle(
      (ctx.settings?.seoTitle as string | undefined) || ctx.tenant.name,
      page?.seoTitle ?? page?.title
    ),
    description:
      page?.seoDescription ??
      (ctx.settings?.seoDescription as string | undefined) ??
      undefined,
    image: page?.ogImageUrl ?? ctx.settings?.seoOgImageUrl ?? ctx.logoUrl,
    noindex: page?.noindex,
    canonicalUrl: page?.canonicalUrl,
  });

  if (isError) return <p className="text-zinc-500">Page not found.</p>;
  if (!page) return <p className="text-zinc-500">Loading…</p>;

  const blocks = page.blocks ?? [];

  return (
    <article className="max-w-5xl">
      {blocks.length > 0 ? (
        <StoreBlockRenderer blocks={blocks} theme={ctx.theme} />
      ) : (
        <>
          <h1 className="text-3xl font-bold">{page.title}</h1>
          <div
            className="prose prose-zinc mt-8 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </>
      )}
    </article>
  );
}
