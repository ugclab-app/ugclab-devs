import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";
import { productImageUrl } from "@/lib/product-images";
import { storeHref } from "@/lib/store-href";
import type { ProductCardProduct } from "@/lib/product-card-types";
import { ProductQuickView } from "@/components/product-quick-view";

export function ProductCard(props: ProductCardProduct) {
  const {
    id,
    slug,
    title,
    priceAmount,
    compareAt,
    currency,
    type,
    typeLabel,
    imageKey,
    locale,
    tenantSlug,
    variantCount = 0,
    defaultVariantId,
    quickAdd = false,
  } = props;

  const { tenant } = useStoreParams();
  const qc = useQueryClient();
  const nav = { locale, tenant: tenantSlug };
  const href = storeHref(`/products/${slug}`, nav);
  const [quickOpen, setQuickOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const needsOptions = variantCount > 1;
  const onSale = compareAt != null && compareAt > priceAmount;

  const add = useMutation({
    mutationFn: () =>
      storeApi.addToCart(tenant, {
        productId: id,
        variantId: defaultVariantId || undefined,
        quantity: 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-context"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
    },
  });

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (needsOptions || !quickAdd) {
      setQuickOpen(true);
      return;
    }
    setAdding(true);
    try {
      await add.mutateAsync();
    } finally {
      setAdding(false);
    }
  }

  const addLabel = adding
    ? "Adding…"
    : added
      ? "Added to cart"
      : needsOptions
        ? "Choose options"
        : "Add to cart";

  return (
    <>
      <li className="product-card group">
        <div className="product-card-media">
          <Link to={href} className="product-card-image-link" aria-label={title}>
            {imageKey ? (
              <img
                src={productImageUrl(imageKey)}
                alt={title}
                loading="lazy"
                className="product-card-image"
              />
            ) : (
              <div className="product-card-placeholder" aria-hidden>
                <span className="product-card-placeholder-icon">◇</span>
              </div>
            )}
          </Link>

          <span className="product-card-type">{typeLabel}</span>

          {onSale ? <span className="product-card-sale">Sale</span> : null}
        </div>

        <div className="product-card-body">
          <Link to={href} className="product-card-title">
            {title}
          </Link>

          <div className="product-card-price-row">
            <span className="product-card-price">{formatMoney(priceAmount, currency)}</span>
            {onSale ? (
              <span className="product-card-compare">{formatMoney(compareAt, currency)}</span>
            ) : null}
          </div>

          <div className="product-card-actions">
            <button
              type="button"
              className="product-card-add"
              disabled={adding}
              onClick={handleAdd}
            >
              {addLabel}
            </button>
            <button
              type="button"
              className="product-card-quick-link"
              onClick={() => setQuickOpen(true)}
            >
              Quick view
            </button>
          </div>
        </div>
      </li>

      {quickOpen ? (
        <ProductQuickView
          slug={slug}
          locale={locale}
          tenantSlug={tenantSlug}
          onClose={() => setQuickOpen(false)}
        />
      ) : null}
    </>
  );
}
