import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, deleteProduct } from "@/api/client";
import { ProductForm } from "@/components/product-form";
import { ProductMetafieldsEditor } from "@/components/product-metafields-editor";
import { ProductRevisionsPanel } from "@/components/product-revisions-panel";
import { ProductSellingOptions } from "@/components/product-selling-options";
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
    requiresShipping?: boolean;
    hsCode?: string | null;
    countryOfOrigin?: string | null;
    seoTitle?: string;
    seoDescription?: string;
    sizeChart?: string;
    countryPrices?: string;
    currencyPrices?: string;
    collectionIds?: string[];
    publishAt?: string | null;
    costAmountCents?: number | null;
    translations?: ProductTranslations | null;
    digitalAsset?: {
      fileName: string;
      sizeBytes: number;
      downloadLimit: number;
      licenseKeysPool?: string | null;
      lessons?: { title: string; body: string; videoUrl: string | null }[] | null;
    } | null;
    payWhatYouWant?: boolean;
    minPriceAmount?: number | null;
    minQuantity?: number;
    maxQuantity?: number | null;
    scheduledPriceAmount?: number | null;
    scheduledCompareAt?: number | null;
    scheduledPriceAt?: string | null;
    variants?: {
      title: string;
      sku: string | null;
      priceAmount: number;
      inventory: number | null;
      supplierVariantId?: string | null;
    }[];
    images?: { id: string; url: string; fileName: string; alt: string | null }[];
    preorderEnabled?: boolean;
    preorderShipAt?: string | null;
    tryBeforeYouBuyEnabled?: boolean;
    tryBeforeYouBuyDays?: number | null;
    subscriptionEnabled?: boolean;
    subscriptionInterval?: string | null;
    sellAsGiftCard?: boolean;
    quantityOffers?: { qty: number; label?: string; priceCents: number }[] | null;
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
          requiresShipping: p.requiresShipping ?? true,
          hsCode: p.hsCode ?? "",
          countryOfOrigin: p.countryOfOrigin ?? "",
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          sizeChart: p.sizeChart ?? "",
          countryPrices: p.countryPrices ?? "",
          currencyPrices: p.currencyPrices ?? "",
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
          licenseKeysPool: p.digitalAsset?.licenseKeysPool ?? "",
          lessons: Array.isArray(p.digitalAsset?.lessons)
            ? p.digitalAsset.lessons.map((l) => ({
                title: l.title ?? "",
                body: l.body ?? "",
                videoUrl: l.videoUrl ?? null,
              }))
            : [],
          payWhatYouWant: p.payWhatYouWant ?? false,
          minPrice:
            p.minPriceAmount != null ? (p.minPriceAmount / 100).toFixed(2) : "",
          minQuantity: p.minQuantity ?? 1,
          maxQuantity: p.maxQuantity ?? null,
          scheduledPrice:
            p.scheduledPriceAmount != null
              ? (p.scheduledPriceAmount / 100).toFixed(2)
              : "",
          scheduledCompareAt:
            p.scheduledCompareAt != null
              ? (p.scheduledCompareAt / 100).toFixed(2)
              : "",
          scheduledPriceAt: p.scheduledPriceAt
            ? new Date(p.scheduledPriceAt).toISOString().slice(0, 16)
            : "",
          variants: (p.variants ?? []).map((v) => ({
            title: v.title,
            sku: v.sku ?? "",
            price: (v.priceAmount / 100).toFixed(2),
            inventory: String(v.inventory ?? ""),
            supplierVariantId: v.supplierVariantId ?? "",
          })),
          translations: (p.translations as ProductTranslations) ?? {},
          quantityOffers: Array.isArray(p.quantityOffers)
            ? (p.quantityOffers as { qty: number; label?: string; priceCents: number }[])
            : [],
        }}
        onSubmit={async (fd) => {
          await api.updateProduct(p.id, fd);
          return { ok: true, message: "Product saved" };
        }}
      />
      <ProductSellingOptions
        productId={p.id}
        initial={{
          preorderEnabled: p.preorderEnabled,
          preorderShipAt: p.preorderShipAt,
          tryBeforeYouBuyEnabled: p.tryBeforeYouBuyEnabled,
          tryBeforeYouBuyDays: p.tryBeforeYouBuyDays,
          subscriptionEnabled: p.subscriptionEnabled,
          subscriptionInterval: p.subscriptionInterval,
          sellAsGiftCard: p.sellAsGiftCard,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <ProductRevisionsPanel productId={p.id} />
        <ProductMetafieldsEditor productId={p.id} />
      </div>
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
