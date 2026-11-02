const API = "/api";

type MoneyRow = { currency: string; cents: number };

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as { error?: string }).error;
    throw new Error(
      detail
        ? `${detail} (${res.status})`
        : `Request failed (${res.status})`
    );
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string, totpCode?: string) =>
    request<{ user: UserDto } | { requires2fa: true; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, totpCode }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: UserDto | null; tenant: unknown }>("/auth/me"),
  dashboard: () =>
    request<{
      metrics: unknown;
      recentTenants: unknown[];
      topStoresByGmv?: unknown[];
      paymentModel?: string;
      actionItems?: unknown[];
    }>("/platform/dashboard"),
  traffic: () =>
    request<{
      generatedAt: string;
      liveWindowSeconds: number;
      visitorsRightNow: number;
      storesWithVisitors: number;
      stores: { tenantId: string; name: string; slug: string; visitors: number }[];
      liveSources: { source: string; visitors: number }[];
      visitors: {
        store: string;
        slug: string;
        tenantId: string;
        country: string | null;
        path: string | null;
        stage: string;
        source: string;
        medium: string | null;
        campaign: string | null;
        lastSeenAt: string;
      }[];
      orders30d: {
        totalOrders: number;
        totalRevenue: number;
        bySource: { source: string; orders: number; revenue: number }[];
        byCampaign: { campaign: string; orders: number; revenue: number }[];
        byAffiliate: { partner: string; code: string; orders: number; revenue: number }[];
      };
    }>("/platform/traffic"),
  system: () =>
    request<{
      paymentModel: string;
      stripeConfigured: boolean;
      emailConfigured: boolean;
      merchantAdminUrl: string;
      storefrontUrl: string;
      platformOpsEmail: string | null;
      database: string;
    }>("/platform/system"),
  payouts: (status?: string) =>
    request<{
      paymentModel: string;
      summary?: { pendingCount: number; pendingCents: number };
      payouts: unknown[];
    }>(`/platform/payouts${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  orders: (params?: URLSearchParams) =>
    request<{ orders: unknown[] }>(
      `/platform/orders${params?.toString() ? `?${params}` : ""}`
    ),
  order: (id: string) =>
    request<{ order: Record<string, unknown> }>(`/platform/orders/${id}`),
  markOrderPaid: (id: string) =>
    request(`/platform/orders/${id}/mark-paid`, { method: "POST" }),
  refundOrder: (id: string, body?: { amountCents?: number; reason?: string }) =>
    request(`/platform/orders/${id}/refund`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  cancelOrder: (id: string) =>
    request(`/platform/orders/${id}/cancel`, { method: "POST" }),
  updateOrderFulfillment: (
    id: string,
    body: { trackingNumber?: string; markFulfilled?: boolean }
  ) =>
    request(`/platform/orders/${id}/fulfillment`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateOrderLineFulfillment: (
    id: string,
    body: {
      items: { lineId: string; fulfilledQuantity: number }[];
      markFulfilled?: boolean;
    }
  ) =>
    request(`/platform/orders/${id}/line-fulfillment`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  addOrderNote: (id: string, body: string) =>
    request(`/platform/orders/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  orderInvoiceUrl: (id: string) => `${API}/platform/orders/${id}/invoice`,
  orderPackingUrl: (id: string) => `${API}/platform/orders/${id}/packing-slip`,
  localPayments: () =>
    request<{
      finikConfigured: boolean;
      gopayConfigured: boolean;
      orders: unknown[];
    }>("/platform/payments/local"),
  unpublishPage: (id: string) =>
    request(`/platform/moderation/pages/${id}/unpublish`, { method: "POST" }),
  previewEmailTemplate: (body: {
    subject: string;
    html: string;
    vars?: Record<string, string>;
  }) =>
    request<{ subject: string; html: string }>("/platform/email-templates/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  markAffiliateCommissionPaid: (id: string, payoutNote?: string) =>
    request(`/platform/affiliates/commissions/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ payoutNote }),
    }),
  bulkMarkAffiliateCommissionsPaid: (ids: string[], payoutNote?: string) =>
    request("/platform/affiliates/commissions/bulk-mark-paid", {
      method: "POST",
      body: JSON.stringify({ ids, payoutNote }),
    }),
  activity: (tenantId?: string) =>
    request<{ logs: unknown[] }>(
      `/platform/activity${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`
    ),
  tenants: (params?: URLSearchParams) =>
    request<{ tenants: unknown[] }>(
      `/platform/tenants${params?.toString() ? `?${params}` : ""}`
    ),
  tenant: (id: string) => request<{ tenant: unknown }>(`/platform/tenants/${id}`),
  tenantProducts: (tenantId: string, params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{
      tenantSlug: string;
      storefrontUrl: string;
      products: unknown[];
    }>(`/platform/tenants/${tenantId}/products${qs ? `?${qs}` : ""}`);
  },
  updateTenant: (id: string, body: Record<string, unknown>) =>
    request(`/platform/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTenant: (id: string) =>
    request<{ ok: true; emailSent: boolean }>(`/platform/tenants/${id}`, {
      method: "DELETE",
    }),
  plans: () => request<{ plans: unknown[] }>("/platform/plans"),
  users: (opts?: { q?: string; role?: string }) => {
    const p = new URLSearchParams();
    if (opts?.q) p.set("q", opts.q);
    if (opts?.role) p.set("role", opts.role);
    const qs = p.toString();
    return request<{ users: unknown[] }>(
      `/platform/users${qs ? `?${qs}` : ""}`
    );
  },
  user: (id: string) => request<{ user: unknown }>(`/platform/users/${id}`),
  updateUser: (id: string, body: Record<string, unknown>) =>
    request<{ user: unknown }>(`/platform/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  revokeUserSessions: (id: string) =>
    request<{ user: unknown }>(`/platform/users/${id}/revoke-sessions`, {
      method: "POST",
    }),
  resetUserPassword: (id: string) =>
    request<{ emailSent?: boolean; temporaryPassword?: string }>(
      `/platform/users/${id}/reset-password`,
      { method: "POST" }
    ),
  impersonateUser: (id: string) =>
    request<{ url: string; expiresInSeconds: number }>(
      `/platform/users/${id}/impersonate`,
      { method: "POST" }
    ),
  exportUsersCsv: () =>
    fetch(`${API}/platform/users/export.csv`, { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    ),
  tenantPayouts: (tenantId: string) =>
    request<{ balance: unknown }>(`/platform/tenants/${tenantId}/payouts`),
  markPayoutProcessing: (tenantId: string, payoutId: string) =>
    request(`/platform/tenants/${tenantId}/payouts/${payoutId}/mark-processing`, {
      method: "POST",
    }),
  markPayoutFailed: (tenantId: string, payoutId: string, note?: string) =>
    request(`/platform/tenants/${tenantId}/payouts/${payoutId}/mark-failed`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  markPayoutPaid: (tenantId: string, payoutId: string) =>
    request(`/platform/tenants/${tenantId}/payouts/${payoutId}/mark-paid`, {
      method: "POST",
    }),
  createTenantPayout: (
    tenantId: string,
    body: { amountCents: number; note?: string; status?: string }
  ) =>
    request(`/platform/tenants/${tenantId}/payouts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  exportTenantsCsv: () =>
    fetch(`${API}/platform/tenants/export.csv`, { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stores.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    ),
  exportPayoutsCsv: () =>
    fetch(`${API}/platform/payouts/export.csv`, { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "platform-payouts.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    ),
  revenue: () => request<{ months: unknown[]; planBreakdown: unknown[]; totalMrrCents: number }>("/platform/revenue"),
  billingHealth: () => request<Record<string, unknown[]>>("/platform/billing-health"),
  disputes: () => request<{ disputes: unknown[] }>("/platform/disputes"),
  submitDisputeEvidence: (
    disputeId: string,
    body: Record<string, unknown>
  ) =>
    request(`/platform/disputes/${disputeId}/evidence`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  audit: (opts?: { action?: string; actor?: string }) => {
    const p = new URLSearchParams();
    if (opts?.action) p.set("action", opts.action);
    if (opts?.actor) p.set("actor", opts.actor);
    const qs = p.toString();
    return request<{ logs: unknown[] }>(`/platform/audit${qs ? `?${qs}` : ""}`);
  },
  platformSettings: () => request<{ settings: unknown }>("/platform/settings"),
  updatePlatformSettings: (body: Record<string, unknown>) =>
    request("/platform/settings", { method: "PATCH", body: JSON.stringify(body) }),
  createPlan: (body: Record<string, unknown>) =>
    request("/platform/plans", { method: "POST", body: JSON.stringify(body) }),
  updatePlan: (id: string, body: Record<string, unknown>) =>
    request(`/platform/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  themes: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{
      summary: {
        total: number;
        published: number;
        featured: number;
        storesWithTheme: number;
        customThemeStores: number;
        untrackedStores: number;
        draftMismatchStores: number;
      };
      themes: unknown[];
    }>(`/platform/themes${qs ? `?${qs}` : ""}`);
  },
  themeStores: (id: string) =>
    request<{ stores: unknown[] }>(`/platform/themes/${id}/stores`),
  themeUntracked: () => request<{ stores: unknown[] }>("/platform/themes/untracked"),
  themeUsage: () =>
    request<{
      byTheme: unknown[];
      customThemeStores: number;
      draftMismatchStores: number;
      totalStores: number;
    }>("/platform/themes/usage"),
  syncThemes: () => request("/platform/themes/sync", { method: "POST" }),
  bulkUpdateThemes: (body: {
    ids: string[];
    published?: boolean;
    featured?: boolean;
    clearFeatured?: boolean;
  }) =>
    request("/platform/themes/bulk", { method: "POST", body: JSON.stringify(body) }),
  moveTheme: (id: string, direction: "up" | "down") =>
    request(`/platform/themes/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),
  assignThemeToStore: (tenantId: string, themeId: string) =>
    request("/platform/themes/assign", {
      method: "POST",
      body: JSON.stringify({ tenantId, themeId }),
    }),
  updateTheme: (id: string, body: Record<string, unknown>) =>
    request(`/platform/themes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  blocks: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ summary: { total: number; published: number }; blocks: unknown[] }>(
      `/platform/blocks${qs ? `?${qs}` : ""}`
    );
  },
  syncBlocks: () => request("/platform/blocks/sync", { method: "POST" }),
  updateBlock: (id: string, body: Record<string, unknown>) =>
    request(`/platform/blocks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  bulkUpdateBlocks: (ids: string[], published: boolean) =>
    request("/platform/blocks/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, published }),
    }),
  sections: () =>
    request<{ summary: { total: number; published: number }; sections: unknown[] }>(
      "/platform/sections"
    ),
  syncSections: () => request("/platform/sections/sync", { method: "POST" }),
  updateSection: (id: string, body: Record<string, unknown>) =>
    request(`/platform/sections/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  emailTemplates: () => request<{ templates: unknown[] }>("/platform/email-templates"),
  updateEmailTemplate: (key: string, body: Record<string, unknown>) =>
    request(`/platform/email-templates/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  testEmailTemplate: (key: string, to: string, vars?: Record<string, string>) =>
    request(`/platform/email-templates/${encodeURIComponent(key)}/test`, {
      method: "POST",
      body: JSON.stringify({ to, vars }),
    }),
  outreach: () =>
    request<{
      templates: { key: string; label: string; subject: string; html: string }[];
      defaultTemplateKey: string;
      signupUrl: string;
      platformName: string;
      limits: { daily: number; sentToday: number; remaining: number };
      recent: {
        id: string;
        actorEmail: string;
        email: string | null;
        templateKey: string | null;
        templateLabel: string | null;
        summary: string;
        createdAt: string;
      }[];
      emailConfigured: boolean;
      prospects: {
        id: string;
        email: string;
        name: string | null;
        templateKey: string;
        status: string;
        sentAt: string | null;
        registeredAt: string | null;
      }[];
    }>("/platform/outreach"),
  addOutreachProspects: (text: string, templateKey?: string) =>
    request<{ added: number; registered: number; skipped: number }>("/platform/outreach/prospects", {
      method: "POST",
      body: JSON.stringify({ text, templateKey }),
    }),
  sendOutreachProspects: () =>
    request<{ sent: number; registered: number; remaining: number }>(
      "/platform/outreach/prospects/send",
      { method: "POST" }
    ),
  growth: () =>
    request<{
      signups: number;
      bySource: { outreach: number; partner: number; direct: number; earlier: number };
      withProduct: number;
      withPaidOrder: number;
      stores: {
        id: string;
        name: string;
        slug: string;
        ownerEmail: string;
        source: string;
        hasProduct: boolean;
        hasPaidOrder: boolean;
        createdAt: string;
      }[];
    }>("/platform/growth"),
  instagramPosts: () =>
    request<{
      posts: {
        id: string;
        title: string;
        caption: string;
        hashtags: string;
        imageUrl: string | null;
        format: string;
        updatedAt: string;
      }[];
    }>("/platform/instagram-posts"),
  saveInstagramPost: (
    body: {
      title: string;
      caption: string;
      hashtags: string;
      imageUrl: string;
      format: string;
    },
    id?: string
  ) =>
    request<{ post: { id: string } }>(
      id ? `/platform/instagram-posts/${id}` : "/platform/instagram-posts",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(body) }
    ),
  deleteInstagramPost: (id: string) =>
    request(`/platform/instagram-posts/${id}`, { method: "DELETE" }),
  sendOutreach: (email: string, name?: string, templateKey?: string) =>
    request<{ ok: boolean; sentTo: string; templateKey: string; remaining: number }>(
      "/platform/outreach/send",
      {
        method: "POST",
        body: JSON.stringify({ email, name, templateKey }),
      }
    ),
  tenantOpsHub: (tenantId: string) =>
    request<Record<string, unknown>>(`/platform/tenants/${tenantId}/ops-hub`),
  moderationQueue: () => request<Record<string, unknown>>("/platform/moderation/queue"),
  updateTenantPlatformFlags: (tenantId: string, flags: string[]) =>
    request(`/platform/tenants/${tenantId}/platform-flags`, {
      method: "PATCH",
      body: JSON.stringify({ flags }),
    }),
  exportThemesCsv: () =>
    fetch(`${API}/platform/themes/export.csv`, { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "themes.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    ),
  domains: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{
      summary: {
        total: number;
        pending: number;
        verified: number;
        tenantsWithCustomDomain: number;
      };
      domains: unknown[];
    }>(`/platform/domains${qs ? `?${qs}` : ""}`);
  },
  domainDns: (id: string) =>
    request<{
      instructions: {
        txtHost: string;
        txtValue: string;
        cnameHost: string;
        cnameTarget: string;
        note: string;
      };
      verificationToken: string;
    }>(`/platform/domains/${id}/dns`),
  domainHistory: (id: string) =>
    request<{ events: unknown[] }>(`/platform/domains/${id}/history`),
  attachDomain: (body: { tenantId: string; domain: string }) =>
    request("/platform/domains", { method: "POST", body: JSON.stringify(body) }),
  attachDomainPair: (body: { tenantId: string; apex: string }) =>
    request("/platform/domains/pair", { method: "POST", body: JSON.stringify(body) }),
  checkDomainDns: (id: string) =>
    request(`/platform/domains/${id}/check-dns`, { method: "POST" }),
  verifyDomain: (id: string) =>
    request(`/platform/domains/${id}/verify`, { method: "POST" }),
  unverifyDomain: (id: string) =>
    request(`/platform/domains/${id}/unverify`, { method: "POST" }),
  setPrimaryDomain: (id: string) =>
    request(`/platform/domains/${id}/primary`, { method: "PATCH" }),
  deleteDomain: (id: string) =>
    request(`/platform/domains/${id}`, { method: "DELETE" }),
  bulkVerifyDomains: (ids: string[]) =>
    request("/platform/domains/bulk-verify", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  bulkRemindDomains: (ids: string[]) =>
    request("/platform/domains/bulk-remind", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  exportDomainsCsv: () =>
    fetch(`${API}/platform/domains/export.csv`, { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "domains.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    ),
  createTenant: (body: Record<string, unknown>) =>
    request<{ tenant: { id: string } }>("/platform/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transferTenantOwner: (id: string, ownerEmail: string) =>
    request(`/platform/tenants/${id}/owner`, {
      method: "PATCH",
      body: JSON.stringify({ ownerEmail }),
    }),
  notes: (entityType: string, entityId: string) =>
    request<{ notes: unknown[] }>(
      `/platform/notes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
    ),
  addNote: (body: { entityType: string; entityId: string; body: string }) =>
    request("/platform/notes", { method: "POST", body: JSON.stringify(body) }),
  tenantMessages: (tenantId: string) =>
    request<{ messages: unknown[] }>(`/platform/tenants/${tenantId}/messages`),
  sendTenantMessage: (
    tenantId: string,
    body: { subject: string; body: string; notifyEmail?: boolean }
  ) =>
    request(`/platform/tenants/${tenantId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  platformMessages: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ messages: unknown[] }>(
      `/platform/messages${qs ? `?${qs}` : ""}`
    );
  },
  announcements: () => request<{ announcements: unknown[] }>("/platform/announcements"),
  createAnnouncement: (body: Record<string, unknown>) =>
    request("/platform/announcements", { method: "POST", body: JSON.stringify(body) }),
  updateAnnouncement: (id: string, body: Record<string, unknown>) =>
    request(`/platform/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  emailLog: () => request<{ logs: unknown[] }>("/platform/email-log"),
  moderation: () => request<{ pendingReviews: unknown[] }>("/platform/moderation"),
  inviteAdmin: (email: string, name?: string) =>
    request<{ emailSent?: boolean; temporaryPassword?: string }>(
      "/platform/users/invite-admin",
      {
      method: "POST",
        body: JSON.stringify({ email, name }),
      }
    ),
  cohortReport: () => request<{ cohort: unknown[] }>("/platform/reports/cohort"),
  inbox: () => request<{ items: unknown[]; counts: Record<string, number> }>("/platform/inbox"),
  mailbox: (params?: { q?: string; closed?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.closed) search.set("closed", "1");
    const qs = search.toString();
    return request<{
      address: { email: string; from: string };
      aliases?: string[];
      forwardTo?: string | null;
      emailConfigured: boolean;
      receivingConfigured: boolean;
      replies: { label: string; body: string }[];
      threads: {
        id: string;
        subject: string;
        correspondentEmail: string;
        correspondentName: string | null;
        status: string;
        unread: boolean;
        lastMessageAt: string;
      }[];
    }>(`/platform/mailbox${qs ? `?${qs}` : ""}`);
  },
  mailboxThread: (id: string) =>
    request<{
      thread: {
        id: string;
        subject: string;
        correspondentEmail: string;
        correspondentName: string | null;
        status: string;
        unread: boolean;
        lastMessageAt: string;
      };
      messages: {
        id: string;
        direction: string;
        fromEmail: string;
        toEmail: string;
        subject: string;
        textBody: string;
        attachments: { id: string; filename: string; contentType?: string; size?: number }[];
        canDownload: boolean;
        actorEmail: string | null;
        createdAt: string;
      }[];
      notes: { id: string; body: string; actorEmail: string; createdAt: string }[];
      stores: {
        id: string;
        name: string;
        slug: string;
        status: string;
        paidOrders: number;
        latestPayout: {
          amountCents: number;
          currency: string;
          status: string;
          createdAt: string;
        } | null;
      }[];
    }>(`/platform/mailbox/${id}`),
  sendMailbox: (body: { to: string; subject: string; body: string }) =>
    request<{ threadId: string }>("/platform/mailbox", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  replyMailbox: (id: string, body: string) =>
    request<{ threadId: string }>(`/platform/mailbox/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  setMailboxStatus: (id: string, status: string) =>
    request<{ ok: boolean; status: string }>(`/platform/mailbox/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  addMailboxNote: (id: string, body: string) =>
    request<{ note: { id: string; body: string; actorEmail: string; createdAt: string } }>(
      `/platform/mailbox/${id}/notes`,
      { method: "POST", body: JSON.stringify({ body }) }
    ),
  search: (q: string) =>
    request<{ stores: unknown[]; orders: unknown[]; users: unknown[]; domains: unknown[] }>(
      `/platform/search?q=${encodeURIComponent(q)}`
    ),
  stripeEvents: () =>
    request<{ events: unknown[]; stripeConfigured: boolean }>("/platform/stripe/events"),
  replayStripeEvent: (id: string) =>
    request<{ ok: boolean; type: string }>(`/platform/stripe/events/${id}/replay`, { method: "POST" }),
  reconcile: () =>
    request<{
      stripe: { available: MoneyRow[]; pending: MoneyRow[] } | null;
      stripeError: string | null;
      owedToMerchants: MoneyRow[];
      payoutsInFlight: MoneyRow[];
      paidLast30Days: MoneyRow[];
      paidAllTime: MoneyRow[];
      heldForProtection: MoneyRow[];
    }>("/platform/reconcile"),
  paymentErrors: () =>
    request<{
      stripe: { id: string; type: string; processed: boolean; error: string | null; createdAt: string; replayable: boolean }[];
      gopay: { id: string; type: string; processed: boolean; error: string | null; createdAt: string }[];
      finik: { id: string; type: string; processed: boolean; error: string | null; createdAt: string }[];
      stuckOrders: { id: string; orderNumber: string; provider: string | null; store: string; tenantId: string; createdAt: string }[];
    }>("/platform/payment-errors"),
  pastDue: () =>
    request<{
      stores: { id: string; name: string; slug: string; status: string | null; plan: string; ownerEmail: string; days: number; canRetry: boolean }[];
    }>("/platform/billing/past-due"),
  retryPastDue: (tenantId: string) =>
    request<{ status: string | null }>(`/platform/billing/past-due/${tenantId}/retry`, { method: "POST" }),
  buyers: (email: string) =>
    request<{
      buyers: { id: string; email: string; name: string | null; country: string | null; orders: number; store: string; tenantId: string; createdAt: string }[];
    }>(`/platform/buyers?email=${encodeURIComponent(email)}`),
  exportBuyer: (email: string) => request<Record<string, unknown>>(`/platform/buyers/export?email=${encodeURIComponent(email)}`),
  eraseBuyer: (email: string) =>
    request<{ customers: number; orders: number }>("/platform/buyers/erase", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  inboxStaff: () => request<{ staff: { id: string; email: string; name: string | null }[] }>("/platform/inbox/staff"),
  inboxAssignments: () => request<{ assignments: Record<string, string> }>("/platform/inbox/assignments"),
  assignInbox: (itemId: string, email: string) =>
    request<{ ok: boolean }>(`/platform/inbox/${encodeURIComponent(itemId)}/assignee`, {
      method: "PUT",
      body: JSON.stringify({ email }),
    }),
  changelog: () =>
    request<{ items: { id: string; title: string; message: string; active: boolean; createdAt: string }[] }>(
      "/platform/changelog"
    ),
  resyncOrder: (orderId: string) =>
    request(`/platform/stripe/resync-order/${orderId}`, { method: "POST" }),
  resyncSubscription: (tenantId: string) =>
    request(`/platform/stripe/resync-subscription/${tenantId}`, { method: "POST" }),
  moderateReview: (id: string, approved: boolean) =>
    request(`/platform/moderation/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
  banProduct: (id: string) =>
    request(`/platform/moderation/products/${id}/ban`, { method: "POST" }),
  updateTenantBilling: (id: string, body: Record<string, unknown>) =>
    request(`/platform/tenants/${id}/billing`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  tenantFeatures: (id: string) =>
    request<{ flags: Record<string, boolean>; defaults: Record<string, boolean> }>(
      `/platform/tenants/${id}/features`
    ),
  updateTenantFeatures: (id: string, flags: Record<string, boolean>) =>
    request(`/platform/tenants/${id}/features`, {
      method: "PATCH",
      body: JSON.stringify(flags),
    }),
  kycSubmissions: (status?: string, q?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request<{
      submissions: {
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        legalName: string;
        country: string;
        passportNumber: string;
        payoutLegalName: string | null;
        hasSelfie: boolean;
        rejectReason: string | null;
        reviewedByEmail: string | null;
        reviewedAt: string | null;
        submittedAt: string;
        tenant: { id: string; name: string; slug: string };
      }[];
    }>(`/platform/kyc${qs ? `?${qs}` : ""}`);
  },
  reviewKyc: (id: string, status: "APPROVED" | "REJECTED" | "PENDING", reason?: string) =>
    request(`/platform/kyc/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    }),
  blacklist: () => request<{ entries: unknown[] }>("/platform/blacklist"),
  addBlacklist: (body: { type: string; value: string; reason?: string }) =>
    request("/platform/blacklist", { method: "POST", body: JSON.stringify(body) }),
  removeBlacklist: (id: string) =>
    request(`/platform/blacklist/${id}`, { method: "DELETE" }),
  bulkSuspendTenants: (tenantIds: string[]) =>
    request("/platform/tenants/bulk-suspend", {
      method: "POST",
      body: JSON.stringify({ tenantIds }),
    }),
  bulkEmailTenants: (tenantIds: string[], subject: string, html: string) =>
    request("/platform/tenants/bulk-email", {
      method: "POST",
      body: JSON.stringify({ tenantIds, subject, html }),
    }),
  archivePlan: (id: string, archived = true) =>
    request(`/platform/plans/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    }),
  migratePlan: (id: string, targetPlanId: string, tenantIds?: string[]) =>
    request(`/platform/plans/${id}/migrate`, {
      method: "POST",
      body: JSON.stringify({ targetPlanId, tenantIds }),
    }),
  retentionAnalytics: () =>
    request<{ summary: unknown; cohort: unknown[] }>("/platform/analytics/retention"),
  exportAuditCsv: () =>
    fetch(`${API}/platform/audit/export.csv`, { credentials: "include" }).then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit.csv";
      a.click();
      URL.revokeObjectURL(url);
    }),
  gdprExport: (userId: string) =>
    request<Record<string, unknown>>(`/platform/users/${userId}/gdpr-export`),
  gdprDelete: (userId: string) =>
    request(`/platform/users/${userId}/gdpr-delete`, { method: "POST" }),
  inviteStaff: (email: string, role: string, name?: string) =>
    request<{ emailSent?: boolean; temporaryPassword?: string }>(
      "/platform/users/invite-staff",
      { method: "POST", body: JSON.stringify({ email, role, name }) }
    ),
  affiliatesSummary: () => request<Record<string, number>>("/platform/affiliates/summary"),
  affiliatesPrograms: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ programs: unknown[] }>(
      `/platform/affiliates/programs${qs ? `?${qs}` : ""}`
    );
  },
  affiliateProgram: (tenantId: string) =>
    request<Record<string, unknown>>(`/platform/affiliates/programs/${tenantId}`),
  patchAffiliateProgram: (
    tenantId: string,
    body: { enabled?: boolean; platformDisabled?: boolean }
  ) =>
    request(`/platform/affiliates/programs/${tenantId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  affiliatesCommissions: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ commissions: unknown[] }>(
      `/platform/affiliates/commissions${qs ? `?${qs}` : ""}`
    );
  },
  affiliatesPartners: (q: string) =>
    request<{ partners: unknown[] }>(
      `/platform/affiliates/partners?q=${encodeURIComponent(q)}`
    ),
  marketingSummary: () => request<Record<string, number>>("/platform/marketing/summary"),
  marketingTenants: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ tenants: unknown[] }>(
      `/platform/marketing/tenants${qs ? `?${qs}` : ""}`
    );
  },
  marketingCampaigns: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return request<{ campaigns: unknown[] }>(
      `/platform/marketing/campaigns${qs ? `?${qs}` : ""}`
    );
  },
  patchMarketingTenant: (
    tenantId: string,
    body: { marketingPaused?: boolean; marketingFeatureOn?: boolean }
  ) =>
    request(`/platform/marketing/tenants/${tenantId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  domainsConfig: () =>
    request<{ config: Record<string, unknown>; usage: unknown[] }>("/platform/domains/config"),
  updateDomainsConfig: (maxCustomDomainsDefault: number) =>
    request<{ config: Record<string, unknown> }>("/platform/domains/config", {
      method: "PATCH",
      body: JSON.stringify({ maxCustomDomainsDefault }),
    }),
  platformPartnerProgram: () => request<Record<string, number>>("/platform/platform-partners/program"),
  savePlatformPartnerProgram: (body: Record<string, number>) =>
    request("/platform/platform-partners/program", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  platformPartners: () => request<{ partners: unknown[] }>("/platform/platform-partners"),
  approvePlatformPartner: (id: string) =>
    request(`/platform/platform-partners/${id}/approve`, { method: "POST" }),
  rejectPlatformPartner: (id: string) =>
    request(`/platform/platform-partners/${id}/reject`, { method: "POST" }),
  suspendPlatformPartner: (id: string) =>
    request(`/platform/platform-partners/${id}/suspend`, { method: "POST" }),
  platformPartnerReferrals: () =>
    request<{ referrals: unknown[] }>("/platform/platform-partners/referrals"),
  platformPartnerPayouts: () => request<{ payouts: unknown[] }>("/platform/platform-partners/payouts"),
  markPlatformPartnerPayoutProcessing: (id: string) =>
    request(`/platform/platform-partners/payouts/${id}/processing`, { method: "POST" }),
  markPlatformPartnerPayoutPaid: (id: string) =>
    request(`/platform/platform-partners/payouts/${id}/paid`, { method: "POST" }),
};

export async function logout() {
  await api.logout();
}
