import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { CollectionForm, type CollectionFormValues } from "@/components/collection-form";
import { useAuth } from "@/context/auth";
import { parseStoreTheme } from "@ugclab/tenant/store-theme";

type CollectionRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  ruleType: "MANUAL" | "AUTO_TAG" | "AUTO_TYPE";
  ruleTag: string | null;
  ruleProductType: string | null;
  products: { product: { id: string } }[];
};

function buildInitial(
  collection: CollectionRecord | undefined,
  themeRaw: unknown
): CollectionFormValues {
  const theme = parseStoreTheme(themeRaw);
  const slug = collection?.slug ?? "";
  const hero = slug ? theme.collectionHeroes?.[slug] : undefined;
  const seo = slug ? theme.collectionSeo?.[slug] : undefined;

  return {
    title: collection?.title ?? "",
    slug,
    description: collection?.description ?? "",
    ruleType: collection?.ruleType ?? "MANUAL",
    ruleTag: collection?.ruleTag ?? "",
    ruleProductType: collection?.ruleProductType ?? "PHYSICAL",
    productIds: collection?.products.map((p) => p.product.id) ?? [],
    seoTitle: seo?.seoTitle ?? "",
    seoDescription: seo?.seoDescription ?? "",
    heroTitle: hero?.title ?? collection?.title ?? "",
    heroSubtitle: hero?.subtitle ?? "",
    heroImageUrl: hero?.imageUrl ?? "",
    heroCta: hero?.ctaLabel ?? "Shop collection",
  };
}

export default function CollectionEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => api.collection(id!),
    enabled: !isNew && !!id,
  });

  const themeRaw =
    (settingsData as { themeDraft?: unknown } | undefined)?.themeDraft ??
    (settingsData as { theme?: unknown } | undefined)?.theme;

  if (!isNew && (isLoading || !data)) {
    return <p className="mx-auto max-w-6xl text-zinc-500">Loading…</p>;
  }

  const collection = data?.collection as CollectionRecord | undefined;
  const initial = buildInitial(collection, themeRaw);

  return (
    <CollectionForm
      mode={isNew ? "create" : "edit"}
      collectionId={collection?.id}
      initial={initial}
      tenantSlug={tenant?.slug}
      onCreated={(newId) => navigate(`/collections/${newId}`)}
    />
  );
}
