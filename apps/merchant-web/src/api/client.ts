const API = "/api";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`
    );
  }
  return data as T;
}

async function requestBlob(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Download failed");
  return res.blob();
}

export const api = {
  impersonate: (token: string) =>
    request<{ user: UserDto; tenant: TenantDto | null }>("/auth/impersonate", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  login: async (email: string, password: string, totpCode?: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totpCode }),
    });
    const data = await res.json().catch(() => ({}));
    if ((data as { requires2fa?: boolean }).requires2fa) {
      return data as { requires2fa: true; email: string };
    }
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error ?? `Request failed (${res.status})`
      );
    }
    return data as { user: UserDto; tenant: TenantDto | null };
  },
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  platformAnnouncement: () =>
    request<{ announcement: { title: string; message: string } | null }>(
      "/merchant/platform-announcement"
    ),
  me: () =>
    request<{ user: UserDto | null; tenant: TenantDto | null }>("/auth/me"),
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
  updateCustomer: (id: string, body: { marketingOptOut?: boolean }) =>
    request(`/merchant/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
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
      platformFeesCents: number;
      paidOutCents: number;
      pendingPayoutCents: number;
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
    request<{ owner: unknown; members: unknown[]; currentUserId: string; isOwner: boolean }>(
      "/merchant/staff"
    ),
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
    request<{ domains: unknown[]; tenantSlug: string }>("/merchant/domains"),
  addDomain: (domain: string) =>
    request("/merchant/domains", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
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
  importProductsCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ created: number }>("/merchant/products/import.csv", {
      method: "POST",
      body: fd,
    });
  },
  updateCollectionRules: (id: string, body: Record<string, unknown>) =>
    request(`/merchant/collections/${id}/rules`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  analytics: (query: string) =>
    request<{ currency: string; paymentModel?: string; analytics: unknown }>(
      `/merchant/analytics?${query}`
    ),
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
    }>(`/merchant/marketing/campaigns/${id}/ab-report`),
  publishTheme: () =>
    request("/merchant/settings/publish-theme", { method: "POST" }),
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

  growth: () => request<Record<string, unknown>>("/merchant/growth"),

  patchGrowthSettings: (body: Record<string, unknown>) =>
    request("/merchant/growth/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

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
};

export async function logout() {
  await api.logout();
}

export const bulkUpdateProductStatus = (ids: string[], status: string) =>
  api.bulkProductStatus(ids, status);

export const duplicateProduct = (id: string) => api.duplicateProduct(id);

export const deleteProduct = (id: string) => api.deleteProduct(id);
