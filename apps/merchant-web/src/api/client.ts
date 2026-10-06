/** `/api` locally; production: `https://tescommerce.com/api` (see VITE_API_URL). */
const API = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 45_000;

async function fetchApi(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export type TenantDto = {
  id: string;
  name: string;
  slug: string;
  settings: {
    currency: string;
    defaultLocale: string;
    enabledLocales?: string[];
    timezone: string;
    primaryColor: string;
    logoUrl: string | null;
    privacyUrl: string | null;
    refundUrl: string | null;
  } | null;
  storefrontUrl: string;
  displayHost: string;
};

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  impersonatedBy?: string | null;
};

export type StoreListItem = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "MEMBER";
  displayHost: string;
};

function apiErrorMessage(data: unknown, status: number, fallback: string): string {
  if (status === 503) {
    const err = (data as { error?: string })?.error;
    if (err) return err;
    return "Server database is unavailable. Try again in a minute.";
  }
  if (status === 504 || status === 502) {
    return "Server timed out. Try again in a minute.";
  }
  return (data as { error?: string })?.error ?? fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetchApi(path, init);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. The server may be starting up — try again.");
    }
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status, `Request failed (${res.status})`));
  }
  return data as T;
}

async function requestBlob(path: string) {
  const res = await fetchApi(path);
  if (!res.ok) throw new Error("Download failed");
  return res.blob();
}

export const api = {
  impersonate: (token: string) =>
    request<{ user: UserDto; tenant: TenantDto | null }>("/auth/impersonate", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  platformPartner: () =>
    request<{
      partner: {
        status: string;
        name: string;
        email: string;
        code: string | null;
        link: string | null;
        qrUrl: string | null;
        blurb: string | null;
        pitch: string;
        payoutMethod: string | null;
        payoutDetails: string | null;
        clicks: number;
        stores: { id: string; name: string; slug: string }[];
        balances: Record<string, { pending: number; available: number; paid: number }>;
        program: {
          turnoverBps: number;
          holdDays: number;
          minPayoutCents: number;
        };
      } | null;
    }>("/auth/partner"),
  savePlatformPartnerPayout: (method: string, details: string) =>
    request("/auth/partner/payout", {
      method: "PUT",
      body: JSON.stringify({ method, details }),
    }),
  requestPlatformPartnerPayout: (currency: string) =>
    request("/auth/partner/payout-request", {
      method: "POST",
      body: JSON.stringify({ currency }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean; message?: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  login: async (
    email: string,
    password: string,
    totpCode?: string,
    rememberMe?: boolean
  ) => {
    let res: Response;
    try {
      res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, totpCode, rememberMe }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Sign-in timed out. Try again or check tescommerce.com API status.");
      }
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    if ((data as { requires2fa?: boolean }).requires2fa) {
      return data as { requires2fa: true; email: string };
    }
    if (!res.ok) {
      throw new Error(apiErrorMessage(data, res.status, `Request failed (${res.status})`));
    }
    return data as { user: UserDto; tenant: TenantDto | null };
  },
  requestMagicLink: (email: string) =>
    request<{ ok: boolean; message?: string }>("/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  completeMagicLink: (token: string, totpCode?: string, rememberMe?: boolean) =>
    request<{ user: UserDto; tenant: TenantDto | null } | { requires2fa: true; email: string }>(
      "/auth/magic-link/complete",
      {
        method: "POST",
        body: JSON.stringify({ token, totpCode, rememberMe }),
      }
    ),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  platformAnnouncement: () =>
    request<{ announcement: { title: string; message: string } | null }>(
      "/merchant/platform-announcement"
    ),
  platformMessages: () =>
    request<{
      unreadCount: number;
      messages: {
        id: string;
        subject: string;
        body: string;
        actorEmail: string;
        readAt: string | null;
        merchantReply: string | null;
        merchantRepliedAt: string | null;
        createdAt: string;
      }[];
    }>("/merchant/platform-messages"),
  markPlatformMessageRead: (id: string) =>
    request(`/merchant/platform-messages/${id}/read`, { method: "POST" }),
  replyPlatformMessage: (id: string, body: string) =>
    request(`/merchant/platform-messages/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  me: () =>
    request<{ user: UserDto | null; tenant: TenantDto | null }>("/auth/me"),
  stores: () =>
    request<{ stores: StoreListItem[]; activeTenantId: string | null }>(
      "/auth/stores"
    ),
  switchStore: (tenantId: string) =>
    request<{ user: UserDto; tenant: TenantDto | null }>("/auth/switch-store", {
      method: "POST",
      body: JSON.stringify({ tenantId }),
    }),
  createStore: (storeName: string, country?: string) =>
    request<{ user: UserDto; tenant: TenantDto | null }>("/auth/create-store", {
      method: "POST",
      body: JSON.stringify({ storeName, country }),
    }),
  dashboard: (range: 7 | 30) =>
    request<{ metrics: unknown; currency: string; range: number }>(
      `/merchant/dashboard?range=${range}`
    ),
  notifications: () =>
    request<{ pendingOrders: number; lowStockCount: number }>(
      "/merchant/notifications"
    ),
  lowStockProducts: () =>
    request<{ products: unknown[]; currency: string }>(
      "/merchant/products/low-stock"
    ),
  products: (params: URLSearchParams) =>
    request<{
      products: unknown[];
      currency: string;
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
    }>(`/merchant/products?${params}`),
  bulkProductDelete: (ids: string[]) =>
    request<{ ok: boolean; deleted: number }>("/merchant/products/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  bulkProductCollections: (
    ids: string[],
    collectionIds: string[],
    mode: "add" | "set" = "add"
  ) =>
    request("/merchant/products/bulk-collections", {
      method: "POST",
      body: JSON.stringify({ ids, collectionIds, mode }),
    }),
  product: (id: string) =>
    request<{ product: unknown; currency: string }>(`/merchant/products/${id}`),
  createProduct: (body: FormData | Record<string, unknown>) =>
    request<{ product: { id: string } }>("/merchant/products", {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  updateProduct: (id: string, body: FormData | Record<string, unknown>) =>
    request(`/merchant/products/${id}`, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  deleteProduct: (id: string) =>
    request(`/merchant/products/${id}`, { method: "DELETE" }),
  uploadProductImage: (productId: string, file: File, alt?: string) => {
    const fd = new FormData();
    fd.append("image", file);
    if (alt) fd.append("alt", alt);
    return request<{ image: { id: string; url: string } }>(
      `/merchant/products/${productId}/images`,
      { method: "POST", body: fd }
    );
  },
  importProductImageFromUrl: (productId: string, url: string, alt?: string) =>
    request<{ image: { id: string; url: string; fileName?: string; alt?: string | null } }>(
      `/merchant/products/${productId}/images/from-url`,
      { method: "POST", body: JSON.stringify({ url, alt }) }
    ),
  fetchMediaFromUrl: (url: string) =>
    request<{ fileName: string; mimeType: string; base64: string }>(
      "/merchant/media/from-url",
      { method: "POST", body: JSON.stringify({ url }) }
    ),
  deleteProductImage: (productId: string, imageId: string) =>
    request(`/merchant/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    }),
  bulkProductStatus: (ids: string[], status: string) =>
    request("/merchant/products/bulk-status", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  duplicateProduct: (id: string) =>
    request<{ product: unknown }>(`/merchant/products/${id}/duplicate`, {
      method: "POST",
    }),
  collections: () => request<{ collections: unknown[] }>("/merchant/collections"),
  collection: (id: string) =>
    request<{ collection: unknown }>(`/merchant/collections/${id}`),
  createCollection: (body: {
    title: string;
    slug?: string;
    description?: string | null;
    ruleType?: string;
    ruleTag?: string;
    ruleProductType?: string;
    productIds?: string[];
  }) =>
    request("/merchant/collections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCollection: (
    id: string,
    body: {
      title?: string;
      slug?: string;
      description?: string | null;
      ruleType?: string;
      ruleTag?: string;
      ruleProductType?: string;
      productIds?: string[];
    }
  ) =>
    request(`/merchant/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCollection: (id: string) =>
    request(`/merchant/collections/${id}`, { method: "DELETE" }),
  shippingZones: () =>
    request<{ zones: unknown[]; currency: string }>("/merchant/shipping-zones"),
  createShippingZone: (body: Record<string, unknown>) =>
    request("/merchant/shipping-zones", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateShippingZone: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/shipping-zones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteShippingZone: (id: string) =>
    request(`/merchant/shipping-zones/${id}`, { method: "DELETE" }),
  orders: (params: URLSearchParams) =>
    request<{
      orders: {
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        platformFeeAmount: number;
        merchantNetCents: number;
        createdAt: string;
        locationLabel: string | null;
        trackingNumber: string | null;
        itemsLabel: string;
        customer?: { email: string } | null;
      }[];
      currency: string;
      paymentModel?: "mor" | "connect";
      page?: number;
      pageSize?: number;
      total?: number;
      summary?: { count: number; totalCents: number; platformFeesCents: number };
    }>(`/merchant/orders?${params}`),
  order: (id: string) =>
    request<{ order: unknown; currency: string }>(`/merchant/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/merchant/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateOrderFulfillment: (
    id: string,
    body: {
      trackingNumber?: string;
      markFulfilled?: boolean;
      notifyCustomer?: boolean;
    }
  ) =>
    request(`/merchant/orders/${id}/fulfillment`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  resendShippingEmail: (id: string) =>
    request(`/merchant/orders/${id}/shipping-email`, { method: "POST" }),
  addOrderNote: (id: string, body: string) =>
    request(`/merchant/orders/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  resendOrderReceipt: (id: string) =>
    request(`/merchant/orders/${id}/resend-receipt`, { method: "POST" }),
  downloadOrdersCsv: async (params?: URLSearchParams, accounting = false) => {
    const allowed = ["status", "q", "from", "to", "country", "view"];
    const qs = new URLSearchParams();
    if (params) {
      for (const key of allowed) {
        const v = params.get(key);
        if (v) qs.set(key, v);
      }
    }
    if (accounting) qs.set("format", "accounting");
    const query = qs.toString();
    const blob = await requestBlob(
      `/merchant/orders/export${query ? `?${query}` : ""}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
  orderInvoiceUrl: (id: string) => `${API}/merchant/orders/${id}/invoice`,
  orderPackingUrl: (id: string) => `${API}/merchant/orders/${id}/packing-slip`,
  customers: (params?: {
    q?: string;
    filter?: string;
    sort?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.filter && params.filter !== "all") sp.set("filter", params.filter);
    if (params?.sort && params.sort !== "newest") sp.set("sort", params.sort);
    const qs = sp.toString();
    return request<{ customers: unknown[]; currency: string }>(
      `/merchant/customers${qs ? `?${qs}` : ""}`
    );
  },
  exportCustomersCsv: async (params?: { q?: string; filter?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.filter && params.filter !== "all") sp.set("filter", params.filter);
    const qs = sp.toString();
    const res = await fetch(`${API}/merchant/customers/export.csv${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
  customer: (id: string) =>
    request<{
      customer: unknown;
      currency: string;
      summary: unknown;
      openAbandonedCart: unknown;
      emailSubscriber: unknown;
    }>(`/merchant/customers/${id}`),
  createCustomer: (body: { email: string; name?: string; country?: string }) =>
    request<{
      customer: {
        id: string;
        email: string;
        name: string | null;
        country: string | null;
      };
    }>("/merchant/customers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCustomer: (id: string, body: { marketingOptOut?: boolean }) =>
    request(`/merchant/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  themeCatalog: () =>
    request<{ themes: unknown[] }>("/merchant/theme-catalog"),
  blockCatalog: () =>
    request<{ blockIds: string[] }>("/merchant/block-catalog"),
  sectionCatalog: () =>
    request<{ sectionIds: string[] }>("/merchant/section-catalog"),
  settings: () =>
    request<{ tenant: unknown; emailConfigured: boolean }>("/merchant/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    request("/merchant/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateThemeDraft: (body: { themeDraft: unknown; primaryColor?: string }) =>
    request("/merchant/settings/theme-draft", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  sendTestStoreEmail: () =>
    request<{ ok: boolean; sentTo: string }>("/merchant/settings/test-email", {
      method: "POST",
    }),
  emailDomain: () =>
    request<{
      domain: {
        domain: string;
        status?: string;
        fromAddress?: string;
        records?: Array<{ type?: string; name?: string; value?: string; record?: string }>;
      } | null;
    }>("/merchant/email-domain"),
  saveEmailDomain: (domain: string) =>
    request<{ domain: { domain: string; status?: string; records?: unknown[] } }>(
      "/merchant/email-domain",
      { method: "POST", body: JSON.stringify({ domain }) }
    ),
  verifyEmailDomain: () =>
    request<{ domain: { domain: string; status?: string; fromAddress?: string; records?: unknown[] } }>(
      "/merchant/email-domain/verify",
      { method: "POST" }
    ),
  themeVersions: () =>
    request<{ versions: unknown[] }>("/merchant/settings/theme-versions"),
  saveThemeVersion: (label: string) =>
    request("/merchant/settings/theme-versions", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  restoreThemeVersion: (id: string) =>
    request("/merchant/settings/theme-versions/" + encodeURIComponent(id) + "/restore", {
      method: "POST",
    }),
  stripeStatus: () =>
    request<{
      configured: boolean;
      connected: boolean;
      chargesEnabled: boolean;
      detailsSubmitted: boolean;
      paymentsReady: boolean;
      platformFeeBps: number;
      planFeeBps: number;
      paymentModel?: "mor" | "connect";
      gopay?: {
        platformConfigured: boolean;
        activeForStore: boolean;
        storeCurrency: string;
      };
      finik?: {
        platformConfigured: boolean;
        activeForStore: boolean;
        storeCurrency: string;
      };
    }>("/merchant/stripe/status"),
  payoutProfile: () =>
    request<{
      paymentModel: string;
      storefrontCurrency: string;
      payoutCurrency: string;
      taxFormType: string | null;
      taxFormLegalName: string | null;
      taxFormIdMasked: string | null;
      hasTaxForm: boolean;
      notifyPayoutFailed: boolean;
    }>("/merchant/stripe/payout-profile"),
  updatePayoutProfile: (body: {
    payoutCurrency?: string | null;
    taxFormType?: string | null;
    taxFormLegalName?: string | null;
    taxFormId?: string | null;
    notifyPayoutFailed?: boolean;
  }) =>
    request("/merchant/stripe/payout-profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  morBalance: () =>
    request<{
      paymentModel: string;
      currency: string;
      storefrontCurrency?: string;
      payoutCurrency?: string;
      earnedCents: number;
      heldCents?: number;
      reserveCents?: number;
      platformFeesCents: number;
      paidOutCents: number;
      pendingPayoutCents: number;
      owedToCreatorsCents?: number;
      availableCents: number;
      payoutMinCents?: number;
      payoutSchedule?: string;
      payouts: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        note: string | null;
        paidAt: string | null;
        createdAt: string;
      }[];
    }>("/merchant/stripe/mor-balance"),
  requestMorPayout: (body?: { amountCents?: number; note?: string }) =>
    request("/merchant/stripe/mor-payout-request", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  exportMorPayoutsCsv: () =>
    requestBlob("/merchant/stripe/mor-payouts/export.csv").then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payouts.csv";
      a.click();
      URL.revokeObjectURL(url);
    }),
  syncOrderStripe: (id: string) =>
    request<{ synced: boolean; message: string; order: unknown }>(
      `/merchant/orders/${id}/sync-stripe`,
      { method: "POST" }
    ),
  stripeConnect: () =>
    request<{ url: string }>("/merchant/stripe/connect", { method: "POST" }),
  stripeDashboardLink: () =>
    request<{ url: string }>("/merchant/stripe/dashboard-link", {
      method: "POST",
    }),
  stripePayouts: () =>
    request<{
      configured: boolean;
      connected: boolean;
      currency?: string;
      balance: { available: number; pending: number } | null;
      payouts: unknown[];
    }>("/merchant/stripe/payouts"),
  billing: () =>
    request<{
      configured: boolean;
      subscription: unknown;
      plans: unknown[];
    }>("/merchant/stripe/billing"),
  billingInvoices: () =>
    request<{
      configured: boolean;
      invoices: {
        id: string;
        number: string | null;
        status: string | null;
        currency: string;
        amountDue: number;
        amountPaid: number;
        createdAt: string;
        hostedInvoiceUrl: string | null;
        invoicePdf: string | null;
      }[];
    }>("/merchant/stripe/billing/invoices"),
  billingCheckout: (planId: string) =>
    request<{ url: string }>("/merchant/stripe/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  billingPortal: () =>
    request<{ url: string }>("/merchant/stripe/billing/portal", { method: "POST" }),
  createShippingLabel: (orderId: string, from?: Record<string, string>) =>
    request<{ order: unknown; label: { trackingNumber: string; labelUrl: string; carrier: string } }>(
      `/merchant/orders/${orderId}/shipping-label`,
      { method: "POST", body: JSON.stringify(from ?? {}) }
    ),
  staff: () =>
    request<{
      owner: unknown;
      members: unknown[];
      currentUserId: string;
      isOwner: boolean;
      seatUsed?: number;
      seatLimit?: number;
    }>("/merchant/staff"),
  buyerProtection: () =>
    request<{ enabled: boolean }>("/merchant/buyer-protection"),
  saveBuyerProtection: (enabled: boolean) =>
    request<{ enabled: boolean }>("/merchant/buyer-protection", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }),
  storefrontPassword: () =>
    request<{ enabled: boolean }>("/merchant/storefront-password"),
  saveStorefrontPassword: (password: string) =>
    request<{ enabled: boolean }>("/merchant/storefront-password", {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
  inviteStaff: (email: string, role: string, permissions?: string[]) =>
    request<{ member: unknown; inviteLink: string; emailSent?: boolean }>(
      "/merchant/staff/invite",
      {
        method: "POST",
        body: JSON.stringify({ email, role, permissions }),
      }
    ),
  resendStaffInvite: (id: string) =>
    request<{ member: unknown; inviteLink: string; emailSent?: boolean }>(
      `/merchant/staff/${id}/resend`,
      { method: "POST" }
    ),
  transferOwnership: (email: string) =>
    request("/merchant/staff/transfer-ownership", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  updateProfile: (body: { name?: string; avatarUrl?: string }) =>
    request("/merchant/me", { method: "PATCH", body: JSON.stringify(body) }),
  removeStaff: (id: string) =>
    request(`/merchant/staff/${id}`, { method: "DELETE" }),
  acceptInvite: (token: string) =>
    request("/merchant/staff/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  discounts: () => request<{ discounts: unknown[] }>("/merchant/discounts"),
  createDiscount: (body: Record<string, unknown>) =>
    request("/merchant/discounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDiscount: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/discounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteDiscount: (id: string) =>
    request(`/merchant/discounts/${id}`, { method: "DELETE" }),
  domains: () =>
    request<{
      domains: unknown[];
      tenantSlug: string;
      aliases?: string[];
      config?: Record<string, unknown>;
    }>("/merchant/domains"),
  updateStoreSlug: (slug: string) =>
    request<{ slug: string; aliases?: string[] }>("/merchant/domains/slug", {
      method: "PATCH",
      body: JSON.stringify({ slug }),
    }),
  addStoreAlias: (slug: string) =>
    request<{ aliases: string[] }>("/merchant/domains/aliases", {
      method: "POST",
      body: JSON.stringify({ slug }),
    }),
  updateStoreAlias: (from: string, to: string) =>
    request<{ aliases: string[] }>("/merchant/domains/aliases", {
      method: "PATCH",
      body: JSON.stringify({ from, to }),
    }),
  deleteStoreAlias: (slug: string) =>
    request<{ aliases: string[] }>("/merchant/domains/aliases", {
      method: "DELETE",
      body: JSON.stringify({ slug }),
    }),
  domainShopConfig: () =>
    request<Record<string, unknown>>("/merchant/domains/config"),
  searchDomains: (q: string) =>
    request<{
      query: string;
      entri: boolean;
      results: Array<{
        domain: string;
        available: boolean | null;
        priceUsd: number | null;
        renewalPriceUsd?: number | null;
        source: string;
      }>;
      registrars: Array<{ id: string; label: string; description: string; url: string }>;
    }>(`/merchant/domains/search?q=${encodeURIComponent(q)}`),
  domainPurchaseLinks: (domain: string) =>
    request<{
      domain: string;
      mode: string;
      registrars: Array<{ id: string; label: string; description: string; url: string }>;
      note?: string;
    }>(`/merchant/domains/purchase-links?domain=${encodeURIComponent(domain)}`),
  addDomain: (domain: string) =>
    request("/merchant/domains", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
  domainDnsInstructions: (id: string) =>
    request<{
      instructions: Record<string, string>;
      verificationToken: string;
      verified: boolean;
    }>(`/merchant/domains/${id}/dns`),
  checkDomainDns: (id: string) =>
    request<{
      ok: boolean;
      dnsOk?: boolean;
      error?: string;
      records?: string[];
      vercel?: { ok: boolean; error?: string };
    }>(`/merchant/domains/${id}/check-dns`, { method: "POST" }),
  verifyDomain: (id: string) =>
    request(`/merchant/domains/${id}/verify`, { method: "POST" }),
  deleteDomain: (id: string) =>
    request(`/merchant/domains/${id}`, { method: "DELETE" }),
  pages: (params?: URLSearchParams) =>
    request<{ pages: unknown[] }>(
      `/merchant/pages${params?.toString() ? `?${params}` : ""}`
    ),
  createPage: (body: Record<string, unknown>) =>
    request("/merchant/pages", { method: "POST", body: JSON.stringify(body) }),
  duplicatePage: (id: string) =>
    request(`/merchant/pages/${id}/duplicate`, { method: "POST" }),
  updatePage: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/pages/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePage: (id: string) => request(`/merchant/pages/${id}`, { method: "DELETE" }),
  reviews: () => request<{ reviews: unknown[] }>("/merchant/reviews"),
  approveReview: (id: string, approved: boolean) =>
    request(`/merchant/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
  updateReview: (
    id: string,
    body: {
      approved?: boolean;
      verifiedPurchase?: boolean;
      pinned?: boolean;
      merchantReply?: string | null;
      rating?: number;
      body?: string | null;
      authorName?: string;
    }
  ) =>
    request(`/merchant/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteReview: (id: string) =>
    request(`/merchant/reviews/${id}`, { method: "DELETE" }),
  createReview: (body: Record<string, unknown>) =>
    request("/merchant/reviews", { method: "POST", body: JSON.stringify(body) }),
  importReviews: (csv: string) =>
    request<{ imported: number; errors?: string[] }>("/merchant/reviews/import", {
      method: "POST",
      body: JSON.stringify({ csv }),
    }),
  questions: () => request<{ questions: unknown[] }>("/merchant/questions"),
  answerQuestion: (id: string, answer: string) =>
    request(`/merchant/questions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ answer }),
    }),
  deleteQuestion: (id: string) =>
    request(`/merchant/questions/${id}`, { method: "DELETE" }),
  markDraftPaid: (id: string) =>
    request(`/merchant/orders/${id}/mark-paid`, { method: "POST" }),
  refundOrder: (
    id: string,
    body?: {
      reason?: string;
      amountCents?: number;
      lineItems?: { lineId: string; quantity: number }[];
    }
  ) =>
    request(`/merchant/orders/${id}/refund`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  updateLineFulfillment: (
    id: string,
    items: { lineId: string; fulfilledQuantity: number }[],
    markFulfilled?: boolean
  ) =>
    request(`/merchant/orders/${id}/line-fulfillment`, {
      method: "PATCH",
      body: JSON.stringify({ items, markFulfilled }),
    }),
  exportProductsCsv: () =>
    requestBlob("/merchant/products/export.csv").then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.csv";
      a.click();
      URL.revokeObjectURL(url);
    }),
  previewProductsCsv: (file: File, mapping?: Record<string, number>) => {
    const fd = new FormData();
    fd.append("file", file);
    if (mapping) fd.append("mapping", JSON.stringify(mapping));
    return request<{
      headers: string[];
      mapping: Record<string, number>;
      rowCount: number;
      errorCount: number;
      preview: { row: number; title: string; price: string; errors: string[] }[];
    }>("/merchant/products/import/preview", { method: "POST", body: fd });
  },
  importProductsCsv: (file: File, mapping?: Record<string, number>) => {
    const fd = new FormData();
    fd.append("file", file);
    if (mapping) fd.append("mapping", JSON.stringify(mapping));
    return request<{
      created: number;
      skipped?: number;
      errors?: { row: number; message: string }[];
    }>("/merchant/products/import.csv", {
      method: "POST",
      body: fd,
    });
  },
  createDraftPaymentLink: (id: string) =>
    request<{ checkoutUrl: string; orderUrl: string; accessToken: string }>(
      `/merchant/orders/${id}/payment-link`,
      { method: "POST" }
    ),
  completeOauth: (token: string) =>
    request<{ user: UserDto; tenant: TenantDto | null }>("/auth/oauth/complete", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  oauthProviders: () => request<{ google: boolean }>("/auth/oauth/providers"),
  updateCollectionRules: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/collections/${id}/rules`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  analytics: (query: string) =>
    request<{ currency: string; paymentModel?: string; analytics: unknown }>(
      `/merchant/analytics?${query}`
    ),
  analyticsLive: () =>
    request<{ currency: string; live: unknown }>("/merchant/analytics/live"),
  exportAnalyticsCsv: async (query: string) => {
    const res = await fetch(`${API}/merchant/analytics/export.csv?${query}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
  promotions: () => request<{ promotions: unknown[] }>("/merchant/promotions"),
  createPromotion: (body: Record<string, unknown>) =>
    request("/merchant/promotions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePromotion: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/promotions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePromotion: (id: string) =>
    request(`/merchant/promotions/${id}`, { method: "DELETE" }),
  importCustomersCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ created: number }>("/merchant/customers/import.csv", {
      method: "POST",
      body: fd,
    });
  },
  importOrdersCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ created: number }>("/merchant/orders/import.csv", {
      method: "POST",
      body: fd,
    });
  },
  search: (q: string) =>
    request<{
      products: unknown[];
      orders: unknown[];
      customers: unknown[];
    }>(`/merchant/search?q=${encodeURIComponent(q)}`),
  uploadMedia: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ media: { url: string; storageKey: string } }>(
      "/merchant/media/upload",
      { method: "POST", body: fd }
    );
  },
  reportsSummary: (range: string) =>
    request(`/merchant/reports/summary?range=${range}`),
  bulkFulfillOrders: (ids: string[]) =>
    request<{ updated: number }>("/merchant/orders/bulk-fulfill", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  bulkCancelOrders: (ids: string[]) =>
    request<{ updated: number }>("/merchant/orders/bulk-cancel", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  bulkShippingLabels: (ids: string[]) =>
    request<{
      attempted: number;
      results: { orderId: string; ok: boolean; labelUrl?: string; error?: string }[];
      note?: string;
    }>("/merchant/orders/bulk-labels", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  createDraftOrder: (body: {
    email: string;
    name?: string;
    lines: { productId: string; quantity?: number }[];
    note?: string;
  }) =>
    request<{ order: { id: string; orderNumber: string } }>("/merchant/orders/draft", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  merchantDisputes: () =>
    request<{
      disputes: {
        id: string;
        disputeId: string;
        orderId: string;
        orderNumber: string;
        amount: number;
        currency: string;
        status: string;
        reason: string;
        evidenceDueBy: string | null;
        evidenceSubmitted?: boolean;
        createdAt: string;
      }[];
    }>("/merchant/disputes"),
  submitMerchantDisputeEvidence: (
    disputeId: string,
    body: Record<string, unknown>
  ) =>
    request(`/merchant/disputes/${disputeId}/evidence`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitSupport: (body: { subject: string; message: string }) =>
    request<{ ok: boolean; message: string }>("/merchant/support", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  abandonedCartStats: () =>
    request<{
      openCarts: number;
      openValueCents: number;
      recoveryRatePct: number | null;
      currency: string;
    }>("/merchant/abandoned-carts/stats"),
  marketingAbReport: (id: string) =>
    request<{
      openRatePct: number;
      clickRatePct: number;
      suggestedWinner: string | null;
      note: string | null;
      subjectA: string;
      subjectB: string | null;
      hasAbTest: boolean;
      abTestPercent: number;
      sentA: number;
      sentB: number;
      openCountA: number;
      openCountB: number;
      openRateAPct: number;
      openRateBPct: number;
    }>(`/merchant/marketing/campaigns/${id}/ab-report`),
  publishTheme: () =>
    request("/merchant/settings/publish-theme", { method: "POST" }),
  scheduleThemePublish: (publishAt: string | null) =>
    request<{ ok: boolean; publishAt: string | null }>(
      "/merchant/settings/schedule-theme",
      { method: "POST", body: JSON.stringify({ publishAt }) }
    ),
  setThemeExperiment: (body: {
    enabled: boolean;
    trafficBPercent?: number;
    snapshotVariantB?: boolean;
  }) =>
    request("/merchant/settings/theme-experiment", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pulse: () =>
    request<{ cards: unknown[] }>("/merchant/pulse"),
  aiBlockEdit: (body: { prompt: string; block: unknown }) =>
    request<{ patch: Record<string, unknown>; block: unknown }>(
      "/merchant/ai/block-edit",
      { method: "POST", body: JSON.stringify(body) }
    ),
  access: () =>
    request<{
      isOwner: boolean;
      role: string | null;
      permissions: string[];
      assignable: string[];
      ownerOnly: string[];
      labels: Record<string, string>;
      presets: Record<string, { label: string; permissions: string[] }>;
      totpEnabled: boolean;
      needs2faForOrders: boolean;
      needs2faForPayouts: boolean;
      all: string[];
    }>("/merchant/access"),
  activityLog: (limit?: number) =>
    request<{ logs: unknown[] }>(
      `/merchant/activity-log${limit != null ? `?limit=${limit}` : ""}`
    ),
  abandonedCarts: () =>
    request<{ carts: unknown[] }>("/merchant/abandoned-carts"),
  sendAbandonedCartRecovery: (cartId: string) =>
    request<{ sent: boolean; email: string }>(
      `/merchant/abandoned-carts/${cartId}/send-recovery`,
      { method: "POST" }
    ),
  customerSegments: () => request("/merchant/customers/segments"),
  bulkExportOrders: async (ids: string[]) => {
    const res = await fetch(`${API}/merchant/orders/bulk-export`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },
  packingSlipUrl: (orderId: string) =>
    `${API}/merchant/orders/${orderId}/packing-slip`,
  updateStaffPermissions: (id: string, permissions: string[]) =>
    request(`/merchant/staff/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    }),
  twoFaStatus: () =>
    request<{ enabled: boolean; email: string }>("/merchant/auth/2fa/status"),
  twoFaSetup: () =>
    request<{ secret: string; uri: string }>("/merchant/auth/2fa/setup", {
      method: "POST",
    }),
  twoFaEnable: (code: string) =>
    request("/merchant/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  twoFaDisable: (code: string, password: string) =>
    request("/merchant/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code, password }),
    }),

  marketingCampaigns: () =>
    request<{
      campaigns: unknown[];
      automations: unknown[];
      templates: { id: string; label: string; subject: string; bodyHtml: string }[];
      collections: { slug: string; title: string }[];
      products: { id: string; title: string }[];
      segments: { id: string; label: string }[];
      emailConfigured: boolean;
      dailyCap: number;
      sentToday: number;
      bulkConfirmThreshold: number;
    }>("/merchant/marketing/campaigns"),

  marketingPreviewRecipients: (
    segment: string,
    opts?: { collectionSlug?: string; productId?: string }
  ) => {
    const q = new URLSearchParams({ segment });
    if (opts?.collectionSlug) q.set("collectionSlug", opts.collectionSlug);
    if (opts?.productId) q.set("productId", opts.productId);
    return request<{ segment: string; count: number; preview: string[] }>(
      `/merchant/marketing/campaigns/preview-recipients?${q}`
    );
  },

  createMarketingCampaign: (body: Record<string, unknown>) =>
    request<{ campaign: { id: string; recipientCount: number } }>(
      "/merchant/marketing/campaigns",
      { method: "POST", body: JSON.stringify(body) }
    ),

  updateMarketingCampaign: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/marketing/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  duplicateMarketingCampaign: (id: string) =>
    request<{ campaign: { id: string } }>(`/merchant/marketing/campaigns/${id}/duplicate`, {
      method: "POST",
    }),

  testMarketingCampaign: (id: string, email?: string) =>
    request(`/merchant/marketing/campaigns/${id}/test`, {
      method: "POST",
      body: JSON.stringify(email ? { email } : {}),
    }),

  testMarketingDraft: (body: {
    subject: string;
    bodyHtml: string;
    discountCode?: string;
    utmCampaign?: string;
    email?: string;
  }) =>
    request<{ ok: boolean; sentTo: string }>("/merchant/marketing/campaigns/test-draft", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelMarketingCampaign: (id: string) =>
    request<{ campaign: unknown }>(`/merchant/marketing/campaigns/${id}/cancel`, {
      method: "POST",
    }),

  sendMarketingCampaign: (id: string) =>
    request<{
      campaign: unknown;
      result: { sent: number; failed: number; total: number };
    }>(`/merchant/marketing/campaigns/${id}/send`, { method: "POST" }),

  deleteMarketingCampaign: (id: string) =>
    request(`/merchant/marketing/campaigns/${id}`, { method: "DELETE" }),

  importMarketingSubscribers: (csv: string) =>
    request<{ imported: number }>("/merchant/marketing/subscribers/import", {
      method: "POST",
      body: JSON.stringify({ csv }),
    }),

  updateMarketingAutomation: (type: string, body: Record<string, unknown>) =>
    request(`/merchant/marketing/automations/${type}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createMarketingAutomation: (body: {
    name: string;
    subject?: string;
    bodyHtml?: string;
    segment?: string;
    enabled?: boolean;
  }) =>
    request<{ automation: { id: string } }>("/merchant/marketing/automations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMarketingAutomationById: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/marketing/automations/id/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMarketingAutomation: (id: string) =>
    request(`/merchant/marketing/automations/id/${id}`, { method: "DELETE" }),

  growth: () => request<Record<string, unknown>>("/merchant/growth"),

  marketplace: () =>
    request<{
      themes: Array<{
        id: string;
        label: string;
        description: string | null;
        category?: string | null;
        priceCents: number;
        owned: boolean;
      }>;
      apps: Array<{
        id: string;
        name: string;
        summary: string;
        description: string;
        category: string;
        priceCents: number;
        interval: string;
        owned: boolean;
        config: { priceCents: number; label: string; cardEnabled: boolean } | null;
      }>;
      purchases: Array<{
        id: string;
        kind: string;
        itemId: string;
        name: string;
        priceCents: number;
        interval: string;
        status: string;
        createdAt: string;
        currentPeriodEnd: string | null;
      }>;
    }>("/merchant/marketplace"),
  saveGiftWrap: (body: { priceCents: number; label: string; cardEnabled: boolean }) =>
    request("/merchant/marketplace/apps/gift-wrap", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  buyAddon: (kind: "THEME" | "APP", itemId: string) =>
    request<{ url: string | null; activated: boolean }>("/merchant/marketplace/checkout", {
      method: "POST",
      body: JSON.stringify({ kind, itemId }),
    }),
  removeApp: (id: string) =>
    request(`/merchant/marketplace/apps/${id}`, { method: "DELETE" }),

  affiliateSettings: () =>
    request<{
      settings: {
        enabled: boolean;
        defaultCommissionBps: number;
        cookieDays: number;
        attributionModel: string;
        updatedAt: string;
      };
    }>("/merchant/affiliates/settings"),

  patchAffiliateSettings: (body: Record<string, unknown>) =>
    request("/merchant/affiliates/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  affiliatePartners: () =>
    request<{ partners: unknown[] }>("/merchant/affiliates/partners"),

  createAffiliatePartner: (body: Record<string, unknown>) =>
    request("/merchant/affiliates/partners", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchAffiliatePartner: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/affiliates/partners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteAffiliatePartner: (id: string) =>
    request(`/merchant/affiliates/partners/${id}`, { method: "DELETE" }),

  affiliateEmailTemplates: () =>
    request<{
      templates: Array<{
        id: string;
        label: string;
        description: string;
        subject: string;
        html: string;
      }>;
      emailConfigured: boolean;
    }>("/merchant/affiliates/email-templates"),

  affiliateEmailPreview: (partnerId: string, templateId: string) =>
    request<{ subject: string; html: string }>(
      `/merchant/affiliates/partners/${partnerId}/email-preview?template=${encodeURIComponent(templateId)}`
    ),

  sendAffiliateCreatorEmail: (
    partnerId: string,
    body: {
      templateId?: string | null;
      subject?: string;
      html?: string;
      text?: string;
    }
  ) =>
    request<{ ok: boolean; sentTo: string; subject: string }>(
      `/merchant/affiliates/partners/${partnerId}/send-email`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  affiliateCommissions: (params?: {
    partnerId?: string;
    status?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.partnerId) q.set("partnerId", params.partnerId);
    if (params?.status) q.set("status", params.status);
    const s = q.toString();
    return request<{ commissions: unknown[] }>(
      `/merchant/affiliates/commissions${s ? `?${s}` : ""}`
    );
  },

  markAffiliateCommissionPaid: (id: string, payoutNote?: string) =>
    request(`/merchant/affiliates/commissions/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ payoutNote }),
    }),

  bulkMarkAffiliateCommissionsPaid: (ids: string[], payoutNote?: string) =>
    request("/merchant/affiliates/commissions/bulk-mark-paid", {
      method: "POST",
      body: JSON.stringify({ ids, payoutNote }),
    }),

  exportAffiliateCommissionsCsv: () =>
    requestBlob("/merchant/affiliates/export.csv"),

  patchGrowthSettings: (body: Record<string, unknown>) =>
    request("/merchant/growth/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getTelegramBot: () =>
    request<{
      telegram: {
        connected: boolean;
        botUsername: string | null;
        enabled: boolean;
        notifyOrders: boolean;
        chatCount: number;
        tokenHint: string | null;
        linkCode: string | null;
      };
    }>("/merchant/telegram"),

  connectTelegramBot: (botToken: string) =>
    request<{
      botUsername: string | null;
      linkCode: string;
      deepLink: string | null;
    }>("/merchant/telegram/connect", {
      method: "POST",
      body: JSON.stringify({ botToken }),
    }),

  disconnectTelegramBot: () =>
    request("/merchant/telegram/disconnect", { method: "POST" }),

  patchTelegramBot: (body: { notifyOrders?: boolean; enabled?: boolean }) =>
    request<{ telegram: unknown }>("/merchant/telegram", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  rotateTelegramLink: () =>
    request<{ linkCode: string; deepLink: string | null }>(
      "/merchant/telegram/rotate-link",
      { method: "POST" }
    ),

  createGiftCard: (body: Record<string, unknown>) =>
    request("/merchant/growth/gift-cards", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchGiftCard: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/growth/gift-cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  createBundle: (body: Record<string, unknown>) =>
    request("/merchant/growth/bundles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchBundle: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/growth/bundles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  createWarehouse: (body: Record<string, unknown>) =>
    request("/merchant/growth/warehouses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  setWarehouseStock: (
    warehouseId: string,
    body: { productId: string; variantId?: string; quantity: number }
  ) =>
    request(`/merchant/growth/warehouses/${warehouseId}/stock`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  createMerchantWebhook: (body: Record<string, unknown>) =>
    request("/merchant/growth/webhooks", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteMerchantWebhook: (id: string) =>
    request(`/merchant/growth/webhooks/${id}`, { method: "DELETE" }),

  testMerchantWebhook: (id: string) =>
    request(`/merchant/growth/webhooks/${id}/test`, { method: "POST" }),

  createMerchantApiKey: (name: string) =>
    request<{ secret: string }>("/merchant/growth/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  deleteMerchantApiKey: (id: string) =>
    request(`/merchant/growth/api-keys/${id}`, { method: "DELETE" }),

  growthSeoProducts: () =>
    request<{ products: unknown[] }>("/merchant/growth/seo/products"),

  bulkGrowthSeo: (items: { id: string; seoTitle?: string; seoDescription?: string }[]) =>
    request("/merchant/growth/seo/bulk", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  patchProductSubscription: (
    id: string,
    body: { subscriptionEnabled: boolean; subscriptionInterval?: string | null }
  ) =>
    request(`/merchant/growth/products/${id}/subscription`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  editOrder: (id: string, body: Record<string, unknown>) =>
    request<{ order: unknown }>(`/merchant/orders/${id}/edit`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setOrderTags: (id: string, tags: string[]) =>
    request(`/merchant/orders/${id}/tags`, {
      method: "PATCH",
      body: JSON.stringify({ tags }),
    }),

  bulkOrderTags: (ids: string[], add: string[], remove: string[]) =>
    request<{ updated: number }>("/merchant/orders/bulk-tags", {
      method: "POST",
      body: JSON.stringify({ ids, add, remove }),
    }),

  orderTagsList: () => request<{ tags: string[] }>("/merchant/orders/tags"),

  inventory: () => request<Record<string, unknown>>("/merchant/inventory"),

  inventoryLookup: (code: string) =>
    request<{ product: unknown }>(
      `/merchant/inventory/lookup?code=${encodeURIComponent(code)}`
    ),

  createInventoryTransfer: (body: Record<string, unknown>) =>
    request("/merchant/inventory/transfers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  receiveInventoryTransfer: (id: string) =>
    request(`/merchant/inventory/transfers/${id}/receive`, { method: "POST" }),

  createPurchaseOrder: (body: Record<string, unknown>) =>
    request("/merchant/inventory/purchase-orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  receivePurchaseOrder: (id: string) =>
    request(`/merchant/inventory/purchase-orders/${id}/receive`, { method: "POST" }),

  previewShippingRates: (body: Record<string, unknown>) =>
    request<{ configured: boolean; rates: unknown[] }>(
      "/merchant/shipping/rates-preview",
      { method: "POST", body: JSON.stringify(body) }
    ),

  /* ─── Commerce v17: selling options, metafields, returns, B2B, pickup ─── */

  patchProductSellingOptions: (
    id: string,
    body: {
      preorderEnabled?: boolean;
      preorderShipAt?: string | null;
      tryBeforeYouBuyEnabled?: boolean;
      tryBeforeYouBuyDays?: number | null;
      subscriptionEnabled?: boolean;
      subscriptionInterval?: string | null;
    }
  ) =>
    request<{ product: unknown }>(`/merchant/products/${id}/selling-options`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  metafields: (ownerType: string, ownerId: string) =>
    request<{ metafields: unknown[] }>(
      `/merchant/metafields?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`
    ),

  putMetafield: (body: {
    ownerType: string;
    ownerId: string;
    namespace?: string;
    key: string;
    type?: string;
    value: string;
  }) =>
    request<{ metafield: unknown }>("/merchant/metafields", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteMetafield: (id: string) =>
    request<{ ok: boolean }>(`/merchant/metafields/${id}`, { method: "DELETE" }),

  metaobjectDefinitions: () =>
    request<{ definitions: unknown[] }>("/merchant/metaobject-definitions"),

  createMetaobjectDefinition: (body: {
    type: string;
    name: string;
    fieldDefs?: unknown;
  }) =>
    request<{ definition: unknown }>("/merchant/metaobject-definitions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  metaobjects: (type?: string) =>
    request<{ definitions: unknown[] }>(
      `/merchant/metaobjects${type ? `?type=${encodeURIComponent(type)}` : ""}`
    ),

  createMetaobject: (body: {
    definitionId: string;
    handle: string;
    fields?: unknown;
  }) =>
    request<{ metaobject: unknown }>("/merchant/metaobjects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchMetaobject: (
    id: string,
    body: { fields?: unknown; handle?: string }
  ) =>
    request<{ metaobject: unknown }>(`/merchant/metaobjects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  returns: () => request<{ returns: unknown[] }>("/merchant/returns"),

  patchReturn: (
    id: string,
    body: {
      status?: string;
      labelUrl?: string | null;
      trackingNumber?: string | null;
      refundAmountCents?: number | null;
      note?: string | null;
    }
  ) =>
    request<{ return: unknown }>(`/merchant/returns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  patchWarehousePickup: (
    id: string,
    body: {
      pickupEnabled?: boolean;
      pickupInstructions?: string | null;
      address1?: string | null;
      address2?: string | null;
      city?: string | null;
      postal?: string | null;
      country?: string | null;
      phone?: string | null;
    }
  ) =>
    request<{ warehouse: unknown }>(`/merchant/warehouses/${id}/pickup`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  markOrderReadyForPickup: (id: string) =>
    request<{ order: unknown }>(`/merchant/orders/${id}/ready-for-pickup`, {
      method: "POST",
    }),

  b2bCompanies: () => request<{ companies: unknown[] }>("/merchant/b2b/companies"),

  createB2bCompany: (body: {
    name: string;
    paymentTermsDays?: number | null;
    note?: string | null;
    priceListId?: string | null;
    status?: string;
  }) =>
    request<{ company: unknown }>("/merchant/b2b/companies", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchB2bCompany: (
    id: string,
    body: {
      name?: string;
      status?: string;
      paymentTermsDays?: number | null;
      depositPercent?: number | null;
      note?: string | null;
      priceListId?: string | null;
      catalogs?: { id: string; name: string; productIds: string[] }[];
    }
  ) =>
    request<{ company: unknown }>(`/merchant/b2b/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  b2bSetupCardSession: (companyId: string) =>
    request<{ url: string }>(
      `/merchant/b2b/companies/${companyId}/setup-card-session`,
      { method: "POST" }
    ),

  addB2bBuyer: (
    companyId: string,
    body: { email: string; name?: string; role?: string }
  ) =>
    request<{ buyer: unknown; customer: unknown }>(
      `/merchant/b2b/companies/${companyId}/buyers`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  b2bPriceLists: () =>
    request<{ priceLists: unknown[] }>("/merchant/b2b/price-lists"),

  createB2bPriceList: (body: {
    name: string;
    currency?: string;
    items?: { productId: string; variantId?: string | null; priceAmount: number }[];
  }) =>
    request<{ priceList: unknown }>("/merchant/b2b/price-lists", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addB2bPriceListItem: (
    id: string,
    body: { productId: string; variantId?: string | null; priceAmount: number }
  ) =>
    request<{ item: unknown }>(`/merchant/b2b/price-lists/${id}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  productSubscriptions: () =>
    request<{ subscriptions: unknown[] }>("/merchant/product-subscriptions"),

  cancelProductSubscription: (id: string) =>
    request<{ subscription: unknown }>(
      `/merchant/product-subscriptions/${id}/cancel`,
      { method: "POST" }
    ),

  pauseProductSubscription: (id: string) =>
    request<{ subscription: unknown }>(
      `/merchant/product-subscriptions/${id}/pause`,
      { method: "POST" }
    ),

  /* ─── Commerce depth: capture, fulfillments, gift cards, B2B quotes ─── */

  captureOrder: (id: string) =>
    request<{ order: unknown }>(`/merchant/orders/${id}/capture`, {
      method: "POST",
    }),

  voidAuthorization: (id: string) =>
    request<{ ok: boolean }>(`/merchant/orders/${id}/void-authorization`, {
      method: "POST",
    }),

  releaseHold: (id: string) =>
    request<{ ok: boolean }>(`/merchant/orders/${id}/release-hold`, {
      method: "POST",
    }),

  splitFulfillments: (id: string) =>
    request<{ shipments: unknown[] }>(
      `/merchant/orders/${id}/split-fulfillments`,
      { method: "POST" }
    ),

  fulfillmentPreview: (id: string) =>
    request<{
      groups: unknown[];
      alreadySplit: boolean;
    }>(`/merchant/orders/${id}/fulfillment-preview`),

  listFulfillments: (id: string) =>
    request<{ shipments: unknown[] }>(`/merchant/orders/${id}/fulfillments`),

  patchFulfillment: (
    id: string,
    body: { status?: string; trackingNumber?: string; labelUrl?: string }
  ) =>
    request<{ shipment: unknown }>(`/merchant/fulfillments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  analyticsCohorts: (query: string) =>
    request<{
      currency: string;
      cohorts: {
        cohort: string;
        customers: number;
        revenue: number;
        retentionW1Pct: number | null;
        retentionW2Pct: number | null;
        retentionW4Pct: number | null;
      }[];
    }>(`/merchant/analytics/cohorts${query ? `?${query}` : ""}`),

  analyticsAttribution: (query: string) =>
    request<{
      currency: string;
      bySource: { source: string; orders: number; revenue: number }[];
      byCampaign: { campaign: string; orders: number; revenue: number }[];
      byAffiliate: {
        partner: string;
        code: string;
        orders: number;
        revenue: number;
      }[];
      totalOrders: number;
      totalRevenue: number;
    }>(`/merchant/analytics/attribution${query ? `?${query}` : ""}`),

  analyticsSessionFunnel: (query: string) =>
    request<{
      steps: {
        stage: string;
        label: string;
        sessions: number;
        conversionFromPrevPct: number | null;
        conversionFromBrowsePct: number | null;
      }[];
      sessionCount: number;
      abandonedCarts: number;
      topEntrySources: { source: string; count: number }[];
    }>(`/merchant/analytics/session-funnel${query ? `?${query}` : ""}`),

  reloadGiftCard: (id: string, amountCents: number) =>
    request<{ giftCard: unknown }>(`/merchant/gift-cards/${id}/reload`, {
      method: "POST",
      body: JSON.stringify({ amountCents }),
    }),

  issueGiftCard: (body: {
    amountCents: number;
    currency?: string;
    recipientEmail?: string;
    note?: string;
  }) =>
    request<{ giftCard: unknown }>("/merchant/gift-cards/issue", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  setSellAsGiftCard: (productId: string, enabled: boolean) =>
    request<{ ok: boolean }>(`/merchant/products/${productId}/sell-as-gift-card`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  b2bQuotes: (companyId?: string) =>
    request<{ quotes: unknown[] }>(
      `/merchant/b2b/quotes${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`
    ),

  createB2bQuote: (body: {
    companyId: string;
    title?: string;
    currency?: string;
    note?: string;
    validUntil?: string;
    lines?: {
      productId: string;
      title: string;
      quantity: number;
      unitAmount: number;
    }[];
  }) =>
    request<{ quote: unknown }>("/merchant/b2b/quotes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  setCompanyCatalog: (id: string, productIds: string[]) =>
    request<{ company: unknown }>(`/merchant/b2b/companies/${id}/catalog`, {
      method: "PATCH",
      body: JSON.stringify({ productIds }),
    }),

  productSubscriptionPortal: (id: string) =>
    request<{ url: string }>(`/merchant/product-subscriptions/${id}/portal`, {
      method: "POST",
    }),
};

export async function logout() {
  await api.logout();
}

export const bulkUpdateProductStatus = (ids: string[], status: string) =>
  api.bulkProductStatus(ids, status);

export const duplicateProduct = (id: string) => api.duplicateProduct(id);

export const deleteProduct = (id: string) => api.deleteProduct(id);
