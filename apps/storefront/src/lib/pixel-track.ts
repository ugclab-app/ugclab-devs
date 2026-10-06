/** Client-side Meta + TikTok funnel events. */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}

export type PixelProduct = {
  id: string;
  title?: string;
  priceAmount?: number;
  currency?: string;
  quantity?: number;
};

function metaContentIds(products: PixelProduct[]) {
  return products.map((p) => p.id).filter(Boolean);
}

export function trackViewContent(product: PixelProduct) {
  try {
    window.fbq?.("track", "ViewContent", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.title,
      value: (product.priceAmount ?? 0) / 100,
      currency: product.currency ?? "USD",
    });
    window.ttq?.track("ViewContent", {
      contents: [{ content_id: product.id, content_type: "product" }],
      value: (product.priceAmount ?? 0) / 100,
      currency: product.currency ?? "USD",
    });
  } catch {
    /* ignore */
  }
}

export function trackAddToCart(product: PixelProduct) {
  const qty = product.quantity ?? 1;
  const value = ((product.priceAmount ?? 0) * qty) / 100;
  try {
    window.fbq?.("track", "AddToCart", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.title,
      value,
      currency: product.currency ?? "USD",
    });
    window.ttq?.track("AddToCart", {
      contents: [
        {
          content_id: product.id,
          content_type: "product",
          quantity: qty,
        },
      ],
      value,
      currency: product.currency ?? "USD",
    });
  } catch {
    /* ignore */
  }
}

export function trackInitiateCheckout(opts: {
  products: PixelProduct[];
  valueCents: number;
  currency: string;
}) {
  const value = opts.valueCents / 100;
  try {
    window.fbq?.("track", "InitiateCheckout", {
      content_ids: metaContentIds(opts.products),
      content_type: "product",
      num_items: opts.products.reduce((s, p) => s + (p.quantity ?? 1), 0),
      value,
      currency: opts.currency,
    });
    window.ttq?.track("InitiateCheckout", {
      contents: opts.products.map((p) => ({
        content_id: p.id,
        content_type: "product",
        quantity: p.quantity ?? 1,
      })),
      value,
      currency: opts.currency,
    });
  } catch {
    /* ignore */
  }
}

export function trackPurchase(opts: {
  orderId: string;
  products: PixelProduct[];
  valueCents: number;
  currency: string;
}) {
  const value = opts.valueCents / 100;
  try {
    window.fbq?.("track", "Purchase", {
      content_ids: metaContentIds(opts.products),
      content_type: "product",
      value,
      currency: opts.currency,
    });
    window.ttq?.track("CompletePayment", {
      contents: opts.products.map((p) => ({
        content_id: p.id,
        content_type: "product",
        quantity: p.quantity ?? 1,
      })),
      value,
      currency: opts.currency,
    });
  } catch {
    /* ignore */
  }
}
