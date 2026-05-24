const API = "/api";

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
  login: (email: string, password: string) =>
    request<{ user: UserDto }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
  activity: (tenantId?: string) =>
    request<{ logs: unknown[] }>(
      `/platform/activity${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`
    ),
  tenants: (params?: URLSearchParams) =>
    request<{ tenants: unknown[] }>(
      `/platform/tenants${params?.toString() ? `?${params}` : ""}`
    ),
  tenant: (id: string) => request<{ tenant: unknown }>(`/platform/tenants/${id}`),
  updateTenant: (id: string, body: Record<string, unknown>) =>
    request(`/platform/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
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
  themes: () => request<{ themes: unknown[] }>("/platform/themes"),
  themeUsage: () => request<{ byTheme: unknown[]; customThemeStores: number }>("/platform/themes/usage"),
  updateTheme: (id: string, body: Record<string, unknown>) =>
    request(`/platform/themes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  domains: () => request<{ domains: unknown[] }>("/platform/domains"),
  verifyDomain: (id: string) =>
    request(`/platform/domains/${id}/verify`, { method: "POST" }),
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
  search: (q: string) =>
    request<{ stores: unknown[]; orders: unknown[]; users: unknown[]; domains: unknown[] }>(
      `/platform/search?q=${encodeURIComponent(q)}`
    ),
  stripeEvents: () =>
    request<{ events: unknown[]; stripeConfigured: boolean }>("/platform/stripe/events"),
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
};

export async function logout() {
  await api.logout();
}
