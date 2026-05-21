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
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`
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
  dashboard: () => request<{ metrics: unknown; recentTenants: unknown[] }>("/platform/dashboard"),
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
  users: (q?: string) =>
    request<{ users: unknown[] }>(
      `/platform/users${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
};

export async function logout() {
  await api.logout();
}
