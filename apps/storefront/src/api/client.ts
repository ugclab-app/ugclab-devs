const API = "/api/store";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (path.includes("/download/")) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Download failed");
    }
    return res as unknown as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

function qs(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

import type { StoreTheme } from "@ugclab/tenant/store-theme";

export type StoreContextDto = {
  tenant: { id: string; name: string; slug: string };
  locale: string;
  currency: string;
  baseCurrency?: string;
  showCurrencyConversion?: boolean;
  primaryColor: string;
  logoUrl: string | null;
  enabledLocales: string[];
  collections: { id: string; title: string; slug: string; description?: string | null }[];
  storePages: { title: string; slug: string }[];
  announcements: string[];
  theme: StoreTheme;
  featuredCollection: { id: string; title: string; slug: string } | null;
  cartCount: number;
  cartLabel: string;
  checkoutGuestLookup: boolean;
  checkoutFooterText: string | null;
  payments?: { stripeLive: boolean; demoMode: boolean };
  settings: {
    currency?: string;
    taxRateBps?: number;
    taxIncluded?: boolean;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoOgImageUrl?: string | null;
    privacyUrl?: string | null;
    refundUrl?: string | null;
    privacyPolicy?: string | null;
    refundPolicy?: string | null;
  } | null;
};

export const storeApi = {
  resolveHost: (host: string) =>
    request<{ slug: string; name: string }>(`/resolve-host${qs({ host })}`),

  context: (tenant: string, locale?: string, preview?: boolean) =>
    request<StoreContextDto>(
      `/context${qs({ tenant, locale, ...(preview ? { preview: "1" } : {}) })}`
    ),

  products: (
    tenant: string,
    params: {
      locale?: string;
      q?: string;
      sort?: string;
      type?: string;
      tag?: string;
      featured?: string;
    }
  ) =>
    request<{
      currency: string;
      products: Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        type: string;
        priceAmount: number;
        compareAt: number | null;
        imageKey: string | null;
        variantCount?: number;
        defaultVariantId?: string | null;
        inventory?: number | null;
        quickAdd?: boolean;
      }>;
      tags: string[];
    }>(`/products${qs({ tenant, ...params })}`),

  product: (tenant: string, slug: string, locale?: string) =>
    request<{
      currency: string;
      product: Record<string, unknown>;
      reviews: Array<{
        id: string;
        authorName: string;
        rating: number;
        body: string | null;
        createdAt: string;
      }>;
      questions: Array<{
        id: string;
        authorName: string;
        question: string;
        answer: string | null;
        answeredAt: string | null;
        createdAt: string;
      }>;
    }>(`/products/${slug}${qs({ tenant, locale })}`),

  collections: (tenant: string) =>
    request<{ collections: Array<{ title: string; slug: string; description?: string | null }> }>(
      `/collections${qs({ tenant })}`
    ),

  collection: (tenant: string, slug: string, locale?: string) =>
    request<{
      collection: {
        title: string;
        slug: string;
        description?: string | null;
        seoTitle?: string | null;
        seoDescription?: string | null;
      };
      currency: string;
      hero?: import("@ugclab/tenant/store-theme").HomeBlock | null;
      products: Array<{
        id: string;
        slug: string;
        title: string;
        priceAmount: number;
        compareAt: number | null;
        type: string;
        imageKey: string | null;
      }>;
    }>(`/collections/${slug}${qs({ tenant, locale })}`),

  cart: (tenant: string) =>
    request<{
      currency: string;
      lines: Array<{
        productId: string;
        slug: string;
        variantId?: string;
        title: string;
        unit: number;
        lineTotal: number;
        quantity: number;
        imageKey: string | null;
      }>;
      total: number;
    }>(`/cart${qs({ tenant })}`),

  addToCart: (tenant: string, body: { productId: string; variantId?: string; quantity?: number }) =>
    request<{ ok: boolean }>(`/cart/add${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cartEmail: (tenant: string, email: string) =>
    request<{ ok: boolean }>(`/cart/email${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  updateCart: (
    tenant: string,
    body: { productId: string; variantId?: string; quantity: number }
  ) =>
    request<{ ok: boolean }>(`/cart${qs({ tenant })}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  removeFromCart: (tenant: string, body: { productId: string; variantId?: string }) =>
    request<{ ok: boolean }>(`/cart${qs({ tenant })}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  validateDiscount: (tenant: string, code: string, subtotalAmount: number) =>
    request<{ discountAmount: number; code?: string }>(
      `/checkout/validate-discount${qs({ tenant })}`,
      { method: "POST", body: JSON.stringify({ code, subtotalAmount }) }
    ),

  placeOrder: (tenant: string, body: Record<string, unknown>) =>
    request<
      | { mode: "stripe"; orderId: string; orderNumber: string; checkoutUrl: string }
      | { mode: "demo"; orderId: string; accessToken: string; orderNumber: string }
    >(`/checkout/place${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  order: (tenant: string, orderId: string, token?: string) =>
    request<{ order: Record<string, unknown> }>(
      `/orders/${orderId}${qs({ tenant, token })}`
    ),

  accountSession: (tenant: string) =>
    request<{ customer: { email: string; orders: Array<Record<string, unknown>> } | null }>(
      `/account/session${qs({ tenant })}`
    ),

  accountLookup: (tenant: string, email: string) =>
    request<{
      orders: Array<{
        id: string;
        orderNumber: string;
        totalAmount: number;
        currency: string;
        createdAt: string;
        accessToken: string | null;
      }>;
    }>(`/account/lookup${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  accountLogin: (tenant: string, email: string, password: string) =>
    request<{ ok: boolean }>(`/account/login${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  policy: (tenant: string, kind: string) =>
    request<{ body: string | null; externalUrl: string | null }>(
      `/policies/${kind}${qs({ tenant })}`
    ),

  wishlist: (tenant: string, ids: string[]) =>
    request<{
      items: Array<{
        productId: string;
        title: string;
        slug: string;
        priceAmount: number;
      }>;
    }>(`/wishlist${qs({ tenant, ids: ids.join(",") })}`),

  page: (tenant: string, slug: string) =>
    request<{
      page: {
        title: string;
        slug: string;
        body: string;
        blocks?: import("@ugclab/tenant/store-theme").HomeBlock[] | null;
      };
    }>(`/pages/${slug}${qs({ tenant })}`),

  blogPosts: (tenant: string) =>
    request<{
      posts: Array<{ title: string; slug: string; body: string; createdAt: string }>;
    }>(`/blog${qs({ tenant })}`),

  blogPost: (tenant: string, slug: string) =>
    request<{ post: { title: string; slug: string; body: string } }>(
      `/blog/${slug}${qs({ tenant })}`
    ),

  storeReviews: (tenant: string, limit = 8) =>
    request<{
      reviews: Array<{
        id: string;
        authorName: string;
        rating: number;
        body: string | null;
        createdAt: string;
        product: { title: string; slug: string } | null;
      }>;
    }>(`/reviews${qs({ tenant, limit: String(limit) })}`),

  newsletterSubscribe: (tenant: string, email: string) =>
    request<{ ok: boolean }>(`/newsletter/subscribe${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  submitReview: (
    tenant: string,
    body: {
      productId: string;
      authorName: string;
      authorEmail?: string;
      rating: number;
      body?: string;
    }
  ) =>
    request<{ ok: boolean }>(`/reviews${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  submitQuestion: (
    tenant: string,
    body: {
      productId: string;
      authorName: string;
      authorEmail?: string;
      question: string;
    }
  ) =>
    request<{ ok: boolean }>(`/questions${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  searchSuggest: (tenant: string, q: string) =>
    request<{
      suggestions: Array<{
        id: string;
        title: string;
        slug: string;
        tags: string[];
        barcode: string | null;
      }>;
    }>(`/search/suggest${qs({ tenant, q })}`),

  recentProducts: (tenant: string, ids: string[], locale?: string) =>
    request<{
      currency: string;
      products: Array<{
        id: string;
        slug: string;
        title: string;
        priceAmount: number;
        compareAt: number | null;
        type: string;
        imageKey: string | null;
      }>;
    }>(`/products/recent${qs({ tenant, ids: ids.join(","), locale })}`),
};
