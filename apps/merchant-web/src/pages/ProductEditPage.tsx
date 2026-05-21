import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, deleteProduct } from "@/api/client";
import { ProductForm } from "@/components/product-form";
import { useAuth } from "@/context/auth";
import type { ProductTranslations } from "@/components/product-translations-fields";

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.product(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const p = data.product as {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    type: "PHYSICAL" | "DIGITAL" | "SERVICE";
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    priceAmount: number;
    compareAt: number | null;
    inventory: number | null;
    sku?: string | null;
    tags?: string[];
    weightGrams?: number | null;
    barcode?: string | null;
    seoTitle?: string;
    seoDescription?: string;
    collectionIds?: string[];
    publishAt?: string | null;
    costAmountCents?: number | null;
    translations?: ProductTranslations | null;
    digitalAsset?: { fileName: string; sizeBytes: number; downloadLimit: number } | null;
    variants?: {
      title: string;
      sku: string | null;
      priceAmount: number;
      inventory: number | null;
    }[];
    images?: { id: string; url: string; fileName: string; alt: string | null }[];
  };

  const enabledLocales = tenant?.settings?.enabledLocales ?? ["en"];

  return (
    <div className="space-y-6">
      {search.get("created") ? (
        <p className="mx-auto max-w-6xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Product created. Add more details and images below.
        </p>
      ) : null}
      <ProductForm
        mode="edit"
        productId={p.id}
        images={p.images ?? []}
        tenantSlug={tenant?.slug}
        currency={data.currency}
        submitLabel="Save changes"
        enabledLocales={enabledLocales}
        initial={{
          title: p.title,
          slug: p.slug,
          description: p.description ?? "",
          type: p.type,
          status: p.status,
          price: (p.priceAmount / 100).toFixed(2),
          compareAt: p.compareAt ? (p.compareAt / 100).toFixed(2) : "",
          inventory: String(p.inventory ?? 0),
          sku: p.sku ?? "",
          tags: (p.tags ?? []).join(", "),
          weightGrams: p.weightGrams != null ? String(p.weightGrams) : "",
          barcode: p.barcode ?? "",
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          collectionIds: p.collectionIds ?? [],
          publishAt: p.publishAt
            ? new Date(p.publishAt).toISOString().slice(0, 16)
            : "",
          costAmount:
            p.costAmountCents != null
              ? (p.costAmountCents / 100).toFixed(2)
              : "",
          digitalFileName: p.digitalAsset?.fileName,
          digitalFileSize: p.digitalAsset?.sizeBytes,
          downloadLimit: p.digitalAsset?.downloadLimit ?? 5,
          variants: (p.variants ?? []).map((v) => ({
            title: v.title,
            sku: v.sku ?? "",
            price: (v.priceAmount / 100).toFixed(2),
            inventory: String(v.inventory ?? ""),
          })),
          translations: (p.translations as ProductTranslations) ?? {},
        }}
        onSubmit={async (fd) => {
          await api.updateProduct(p.id, fd);
          return { ok: true, message: "Product saved" };
        }}
      />
      <div className="mx-auto max-w-6xl pb-8">
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Delete this product?")) return;
            await deleteProduct(p.id);
            navigate("/products");
          }}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
        >
          Delete product
        </button>
      </div>
    </div>
  );
}
