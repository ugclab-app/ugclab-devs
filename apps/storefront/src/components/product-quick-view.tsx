import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, moneyLocaleFor } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";
import { productImageUrl } from "@/lib/product-images";
import { storeHref } from "@/lib/store-href";
import { ProductPurchase } from "@/components/product-purchase";

export function ProductQuickView({
  slug,
  locale,
  tenantSlug,
  onClose,
}: {
  slug: string;
  locale: string;
  tenantSlug: string;
  onClose: () => void;
}) {
  const { tenant } = useStoreParams();
  const nav = { locale, tenant: tenantSlug };

  const { data, isLoading } = useQuery({
    queryKey: ["product", tenant, slug, locale, "quick"],
    queryFn: () => storeApi.product(tenant, slug, locale),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const product = data?.product as
    | {
        id: string;
        title: string;
        description: string | null;
        type: string;
        priceAmount: number;
        compareAt: number | null;
        inventory: number | null;
        images: { storageKey: string; alt: string | null }[];
        variants: { id: string; title: string; inventory: number | null }[];
      }
    | undefined;

  return (
    <div className="store-quick-view-overlay" onClick={onClose} role="presentation">
      <div
        className="store-quick-view-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="store-quick-view-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {isLoading || !product ? (
          <p className="p-8 text-zinc-500">Loading…</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100">
              {product.images[0] ? (
                <img
                  src={productImageUrl(product.images[0].storageKey)}
                  alt={product.images[0].alt ?? product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-300">◇</div>
              )}
            </div>
            <div className="flex flex-col p-2 sm:pr-4">
              <h2 id="quick-view-title" className="text-xl font-bold text-zinc-900">
                {product.title}
              </h2>
              {product.description ? (
                <p className="mt-2 line-clamp-4 text-sm text-zinc-600">{product.description}</p>
              ) : null}
              <div className="mt-4 flex-1">
                <ProductPurchase
                  productId={product.id}
                  priceLabel={formatMoney(
                    product.priceAmount,
                    data!.currency,
                    moneyLocaleFor(data!.currency, locale)
                  )}
                  variants={product.variants}
                  productInventory={product.inventory}
                  type={product.type}
                />
              </div>
              <Link
                to={storeHref(`/products/${slug}`, nav)}
                className="mt-4 text-center text-sm font-medium text-violet-700 hover:underline"
                onClick={onClose}
              >
                View full details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
