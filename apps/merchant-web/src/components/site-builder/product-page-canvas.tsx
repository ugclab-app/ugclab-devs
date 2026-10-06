import { formatMoney } from "@ugclab/i18n";
import type { BuilderSelection } from "./builder-types";

export type ProductPreviewData = {
  id: string;
  slug: string;
  title: string;
  priceAmount: number;
  compareAt?: number | null;
  description?: string | null;
  currency: string;
  images: { id?: string; url: string }[];
};

export function ProductPageCanvas({
  product,
  primaryColor,
  selection,
  onSelectProduct,
}: {
  product: ProductPreviewData;
  primaryColor: string;
  selection: BuilderSelection | null;
  onSelectProduct: () => void;
}) {
  const selected = selection?.kind === "product" && selection.id === product.id;
  const img = product.images[0]?.url;
  const thumbs = product.images.slice(0, 4);
  const price = formatMoney(product.priceAmount, product.currency);
  const compare =
    product.compareAt != null && product.compareAt > product.priceAmount
      ? formatMoney(product.compareAt, product.currency)
      : null;
  const descText = (product.description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectProduct();
      }}
      className={`site-builder-shell-zone site-builder-pdp${
        selected ? " is-selected" : ""
      }`}
    >
      <span className="site-builder-shell-label">Product</span>
      <div className="site-builder-pdp-inner">
        <div className="site-builder-pdp-gallery">
          <div className="site-builder-pdp-thumbs">
            {(thumbs.length ? thumbs : [{ url: "" }]).map((t, i) => (
              <div key={t.id ?? i} className="site-builder-pdp-thumb">
                {t.url ? (
                  <img src={t.url} alt="" />
                ) : (
                  <span className="site-builder-pdp-ph">◇</span>
                )}
              </div>
            ))}
          </div>
          <div className="site-builder-pdp-main">
            {img ? (
              <img src={img} alt="" />
            ) : (
              <div className="site-builder-pdp-ph-lg">No image</div>
            )}
          </div>
        </div>
        <div className="site-builder-pdp-info">
          <p className="site-builder-pdp-title">{product.title}</p>
          <div className="site-builder-pdp-price-row">
            <span className="site-builder-pdp-price">{price}</span>
            {compare ? (
              <span className="site-builder-pdp-compare">{compare}</span>
            ) : null}
          </div>
          {descText ? (
            <p className="site-builder-pdp-desc">{descText}…</p>
          ) : (
            <p className="site-builder-pdp-desc is-muted">
              No description — click to edit product content
            </p>
          )}
          <div
            className="site-builder-pdp-atc"
            style={{ background: primaryColor }}
          >
            Add to cart
          </div>
          <p className="site-builder-pdp-hint">
            Click to edit title, photos, price · sections below are page blocks
          </p>
        </div>
      </div>
    </button>
  );
}
