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

export type CustomerAddress = {
  id: string;
  label: string | null;
  name: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postal: string | null;
  country: string;
  isDefault: boolean;
};

export type StoreContextDto = {
  tenant: { id: string; name: string; slug: string };
  locale: string;
  currency: string;
  baseCurrency?: string;
  displayCurrencies?: string[];
  marketCountries?: string[];
  showCurrencyConversion?: boolean;
  primaryColor: string;
  /** Present when viewing ?themePreview= catalog demo */
  themeDemoLabel?: string | null;
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
  payments?: {
    stripeLive: boolean;
    gopayLive?: boolean;
    finikLive?: boolean;
    demoMode: boolean;
    paymentModel?: string;
  };
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
    termsOfService?: string | null;
    termsUrl?: string | null;
    shippingPolicy?: string | null;
    shippingUrl?: string | null;
    legalNotice?: string | null;
    legalNoticeUrl?: string | null;
    contactPolicy?: string | null;
    returnRules?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    businessAddress?: string | null;
    faviconUrl?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    businessAddress?: string | null;
  } | null;
  integrations?: {
    metaPixelId?: string;
    gaMeasurementId?: string;
    tiktokPixelId?: string;
    gtmId?: string;
    aiCatalogEnabled?: boolean;
  };
  addons?: string[];
  giftWrap?: { priceCents: number; label: string; cardEnabled: boolean } | null;
  passwordLocked?: boolean;
  postCheckoutUpsell?: {
    enabled?: boolean;
    headline?: string;
    productIds?: string[];
  };
};

export const storeApi = {
  resolveHost: (host: string) =>
    request<{ slug: string; name: string }>(`/resolve-host${qs({ host })}`),

  context: (
    tenant: string,
    locale?: string,
    preview?: boolean,
    themePreview?: string,
    currency?: string
  ) =>
    request<StoreContextDto>(
      `/context${qs({
        tenant,
        locale,
        currency,
        ...(preview ? { preview: "1" } : {}),
        ...(themePreview ? { themePreview } : {}),
      })}`
    ),

  products: (
    tenant: string,
    params: {
      locale?: string;
      currency?: string;
      country?: string;
      q?: string;
      sort?: string;
      type?: string;
      tag?: string;
      featured?: string;
      min?: string;
      max?: string;
      inStock?: string;
      page?: string;
      pageSize?: string;
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
      total?: number;
      page?: number;
      pageSize?: number;
    }>(`/products${qs({ tenant, ...params })}`),

  product: (tenant: string, slug: string, locale?: string, currency?: string, country?: string) =>
    request<{
      currency: string;
      product: Record<string, unknown>;
      reviews: Array<{
        id: string;
        authorName: string;
        rating: number;
        body: string | null;
        photoUrls?: string[];
        verifiedPurchase?: boolean;
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
    }>(`/products/${slug}${qs({ tenant, locale, currency, country })}`),

  bundles: (tenant: string) =>
    request<{
      bundles: Array<{
        id: string;
        title: string;
        items: Array<{
          product: {
            id: string;
            title: string;
            slug: string;
            images: Array<{ url: string }>;
          };
        }>;
      }>;
    }>(`/bundles${qs({ tenant })}`),

  collections: (tenant: string) =>
    request<{ collections: Array<{ title: string; slug: string; description?: string | null }> }>(
      `/collections${qs({ tenant })}`
    ),

  collection: (
    tenant: string,
    slug: string,
    opts?: {
      locale?: string;
      currency?: string;
      country?: string;
      sort?: string;
      min?: string;
      max?: string;
      inStock?: string;
      page?: string;
      pageSize?: string;
    }
  ) =>
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
        inventory?: number | null;
      }>;
      total?: number;
      page?: number;
      pageSize?: number;
    }>(`/collections/${slug}${qs({ tenant, ...opts })}`),

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

  addToCart: (
    tenant: string,
    body: { productId: string; variantId?: string; quantity?: number; subscribe?: boolean }
  ) =>
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

  shippingRates: (
    tenant: string,
    body: { country: string; city?: string; postal?: string; weightGrams?: number }
  ) =>
    request<{
      rates: { id: string; label: string; amountCents: number; provider: string }[];
    }>(`/checkout/shipping-rates${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  validateGiftCard: (tenant: string, code: string, orderTotal: number) =>
    request<{ giftCardAmount: number; code?: string }>(
      `/checkout/validate-gift-card${qs({ tenant })}`,
      { method: "POST", body: JSON.stringify({ code, orderTotal }) }
    ),

  unlockStore: (tenant: string, password: string) =>
    request<{ ok: boolean }>(`/unlock${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  cartSuggestions: (tenant: string) =>
    request<{
      products: {
        id: string;
        title: string;
        slug: string;
        priceAmount: number;
        currency: string;
        imageKey: string | null;
      }[];
    }>(`/cart-suggestions${qs({ tenant })}`),

  upsellProducts: (tenant: string) =>
    request<{
      headline: string;
      products: {
        id: string;
        title: string;
        slug: string;
        priceAmount: number;
        currency: string;
      }[];
    }>(`/upsell-products${qs({ tenant })}`),

  affiliateAttribution: (tenant: string, code: string) =>
    request<{ valid: boolean; code?: string; displayName?: string }>(
      `/affiliate/attribution${qs({ tenant })}`,
      { method: "POST", body: JSON.stringify({ code }) }
    ),

  affiliateResolve: (tenant: string, code: string) =>
    request<{ valid: boolean; code?: string; displayName?: string }>(
      `/affiliate/resolve${qs({ tenant, code })}`
    ),

  placeOrder: (tenant: string, body: Record<string, unknown>) =>
    request<
      | { mode: "stripe"; orderId: string; orderNumber: string; checkoutUrl: string }
      | { mode: "gopay"; orderId: string; orderNumber: string; checkoutUrl: string }
      | { mode: "finik"; orderId: string; orderNumber: string; checkoutUrl: string }
      | { mode: "demo"; orderId: string; accessToken: string; orderNumber: string }
    >(`/checkout/place${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  order: (tenant: string, orderId: string, token?: string) =>
    request<{
      order: Record<string, unknown>;
      awaitingFinikPayment?: boolean;
    }>(`/orders/${orderId}${qs({ tenant, token })}`),

  confirmReceived: (tenant: string, orderId: string, token?: string) =>
    request<{ ok: boolean }>(`/orders/${orderId}/received${qs({ tenant, token })}`, {
      method: "POST",
    }),

  accountSession: (tenant: string) =>
    request<{
      customer: {
        id?: string;
        email: string;
        name?: string | null;
        b2bCompanyId?: string | null;
        orders: Array<Record<string, unknown>>;
      } | null;
      b2b?: {
        companyId: string;
        companyName: string;
        status: string;
        paymentTermsDays: number | null;
        catalogProductIds: string[];
        role: string;
      } | null;
    }>(`/account/session${qs({ tenant })}`),

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

  accountRegister: (
    tenant: string,
    body: { email: string; password: string; name?: string }
  ) =>
    request<{ ok: boolean }>(`/account/register${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  accountForgot: (tenant: string, email: string) =>
    request<{ ok: boolean }>(`/account/forgot${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  accountReset: (tenant: string, token: string, password: string) =>
    request<{ ok: boolean }>(`/account/reset${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  accountLogout: (tenant: string) =>
    request<{ ok: boolean }>(`/account/logout${qs({ tenant })}`, { method: "POST" }),

  updateProfile: (
    tenant: string,
    body: { name?: string; currentPassword?: string; newPassword?: string }
  ) =>
    request<{ customer: { id: string; email: string; name: string | null } }>(
      `/account/profile${qs({ tenant })}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  addresses: (tenant: string) =>
    request<{ addresses: CustomerAddress[] }>(`/account/addresses${qs({ tenant })}`),

  createAddress: (
    tenant: string,
    body: {
      label?: string;
      name: string;
      phone?: string;
      address1: string;
      address2?: string;
      city: string;
      postal?: string;
      country: string;
      isDefault?: boolean;
    }
  ) =>
    request<{ address: CustomerAddress }>(`/account/addresses${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteAddress: (tenant: string, id: string) =>
    request<{ ok: boolean }>(`/account/addresses/${id}${qs({ tenant })}`, {
      method: "DELETE",
    }),

  accountWishlist: (tenant: string) =>
    request<{ productIds: string[] }>(`/account/wishlist${qs({ tenant })}`),

  wishlistAdd: (tenant: string, productIds: string[]) =>
    request<{ productIds: string[] }>(`/account/wishlist${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),

  wishlistRemove: (tenant: string, productId: string) =>
    request<{ ok: boolean }>(
      `/account/wishlist${qs({ tenant, productId })}`,
      { method: "DELETE" }
    ),

  stockAlert: (
    tenant: string,
    body: { productId: string; variantId?: string; email: string }
  ) =>
    request<{ ok: boolean }>(`/stock-alerts${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  policy: (tenant: string, kind: string) =>
    request<{ body: string | null; externalUrl: string | null; title?: string }>(
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

  page: (tenant: string, slug: string, preview?: boolean) =>
    request<{
      page: {
        title: string;
        slug: string;
        body: string;
        excerpt?: string | null;
        seoTitle?: string;
        seoDescription?: string;
        ogImageUrl?: string;
        noindex?: boolean;
        canonicalUrl?: string;
        blocks?: import("@ugclab/tenant/store-theme").HomeBlock[] | null;
      };
    }>(`/pages/${slug}${qs({ tenant, ...(preview ? { preview: "1" } : {}) })}`),

  blogPosts: (
    tenant: string,
    opts?: { tag?: string; sort?: string }
  ) =>
    request<{
      posts: Array<{
        title: string;
        slug: string;
        excerpt: string;
        featuredImageUrl: string | null;
        authorName: string | null;
        tags: string[];
        createdAt: string;
        publishedAt: string;
      }>;
    }>(`/blog${qs({ tenant, ...opts })}`),

  blogPost: (tenant: string, slug: string, preview?: boolean) =>
    request<{
      post: {
        title: string;
        slug: string;
        body: string;
        excerpt: string | null;
        featuredImageUrl: string | null;
        authorName: string | null;
        tags: string[];
        seoTitle?: string;
        seoDescription?: string;
        ogImageUrl?: string;
        noindex?: boolean;
        canonicalUrl?: string;
        publishedAt: string;
      };
    }>(`/blog/${slug}${qs({ tenant, ...(preview ? { preview: "1" } : {}) })}`),

  blogRssUrl: (tenant: string) =>
    `/api/store/blog/rss.xml${qs({ tenant })}`,

  storeReviews: (
    tenant: string,
    opts?: {
      limit?: string;
      minRating?: string;
      sort?: "newest" | "rating";
      pinned?: string;
    },
  ) =>
    request<{
      reviews: Array<{
        id: string;
        authorName: string;
        rating: number;
        body: string | null;
        photoUrls?: string[];
        createdAt: string;
        product: { title: string; slug: string } | null;
      }>;
    }>(
      `/reviews${qs({
        tenant,
        limit: opts?.limit ?? "8",
        ...(opts?.minRating ? { minRating: opts.minRating } : {}),
        ...(opts?.sort ? { sort: opts.sort } : {}),
        ...(opts?.pinned ? { pinned: opts.pinned } : {}),
      })}`,
    ),

  contact: (
    tenant: string,
    body: { name: string; email: string; message: string; website?: string }
  ) =>
    request<{ ok: boolean }>(`/contact${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  newsletterSubscribe: (tenant: string, email: string) =>
    request<{ ok: boolean }>(`/newsletter/subscribe${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  submitReview: (
    tenant: string,
    body:
      | {
          productId: string;
          authorName: string;
          authorEmail?: string;
          rating: number;
          body?: string;
          photos?: File[];
        }
      | FormData
  ) => {
    if (body instanceof FormData) {
      return fetch(`${API}/reviews${qs({ tenant })}`, {
        method: "POST",
        credentials: "include",
        body,
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? res.statusText);
        }
        return data as { ok: boolean };
      });
    }
    const photos = body.photos?.filter((f) => f.size > 0).slice(0, 4) ?? [];
    if (photos.length > 0) {
      const fd = new FormData();
      fd.set("productId", body.productId);
      fd.set("authorName", body.authorName);
      if (body.authorEmail) fd.set("authorEmail", body.authorEmail);
      fd.set("rating", String(body.rating));
      if (body.body) fd.set("body", body.body);
      for (const photo of photos) fd.append("photos", photo);
      return fetch(`${API}/reviews${qs({ tenant })}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? res.statusText);
        }
        return data as { ok: boolean };
      });
    }
    return request<{ ok: boolean }>(`/reviews${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify({
        productId: body.productId,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        rating: body.rating,
        body: body.body,
      }),
    });
  },

  markReviewHelpful: (tenant: string, reviewId: string) =>
    request<{ ok: boolean; helpfulCount: number }>(
      `/reviews/${reviewId}/helpful${qs({ tenant })}`,
      { method: "POST" }
    ),

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

  livePing: (
    tenant: string,
    body: {
      sessionId: string;
      country?: string;
      path?: string;
      stage?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      referrer?: string;
    }
  ) =>
    request<{ ok: boolean }>(`/live-ping${qs({ tenant })}`, {
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

  pickupLocations: (tenant: string, productIds?: string[]) =>
    request<{
      locations: Array<{
        id: string;
        name: string;
        address1: string | null;
        address2: string | null;
        city: string | null;
        postal: string | null;
        country: string | null;
        phone: string | null;
        pickupInstructions: string | null;
        inStock?: boolean;
      }>;
    }>(
      `/pickup-locations${qs({
        tenant,
        productIds: productIds?.length ? productIds.join(",") : undefined,
      })}`
    ),

  giftCardBalance: (tenant: string, code: string) =>
    request<{
      code: string;
      balanceCents: number;
      currency: string;
      expiresAt: string | null;
    }>(`/gift-cards/balance${qs({ tenant, code })}`),

  subscriptionPortal: (tenant: string) =>
    request<{ url: string }>(`/account/subscription-portal${qs({ tenant })}`, {
      method: "POST",
    }),

  accountEntitlements: (tenant: string) =>
    request<{
      entitlements: Array<{
        id: string;
        productId: string;
        active: boolean;
        accessToken: string;
        expiresAt: string | null;
        product: { id: string; title: string; slug: string } | null;
      }>;
    }>(`/account/entitlements${qs({ tenant })}`),

  returnEligible: (tenant: string, orderId: string, token?: string) =>
    request<{
      orderId: string;
      orderNumber: string;
      items: Array<{
        id: string;
        title: string;
        quantity: number;
        unitAmount: number;
      }>;
      existingReturns: Array<{
        id: string;
        rmaCode: string;
        status: string;
        isExchange: boolean;
      }>;
    }>(`/orders/${orderId}/return-eligible${qs({ tenant, token })}`),

  createReturn: (
    tenant: string,
    orderId: string,
    body: {
      token?: string;
      reason?: string;
      note?: string;
      isExchange?: boolean;
      exchangeProductId?: string;
      exchangeVariantId?: string;
      items: { orderLineItemId: string; quantity: number; reason?: string }[];
    }
  ) =>
    request<{ return: unknown }>(`/orders/${orderId}/returns${qs({ tenant })}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  accountReturns: (tenant: string) =>
    request<{
      returns: Array<{
        id: string;
        rmaCode: string;
        status: string;
        isExchange: boolean;
        createdAt: string;
        order: { id: string; orderNumber: string };
      }>;
    }>(`/account/returns${qs({ tenant })}`),
};
