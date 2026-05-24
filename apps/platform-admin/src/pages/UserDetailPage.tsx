import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";
import { PlatformNotes } from "@/components/platform-notes";

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountStatus: string;
  bannedAt: string | null;
  country: string | null;
  timezone: string;
  totpEnabled: boolean;
  requireAdmin2fa: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  sessionVersion: number;
  createdAt: string;
  ownedStores: {
    id: string;
    name: string;
    slug: string;
    status: string;
    storefrontUrl: string;
  }[];
  memberships: {
    id: string;
    role: string;
    email: string;
    tenant: { id: string; name: string; slug: string };
  }[];
  oauthAccounts: { provider: string; providerAccountId: string }[];
  recentPlatformAudit: {
    id: string;
    action: string;
    actorEmail: string;
    summary: string;
    createdAt: string;
  }[];
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [resetResult, setResetResult] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["platform-user", id],
    queryFn: () => api.user(id!),
    enabled: !!id,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["platform-user", id] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <QueryState query={query}>
      {(data) => (
        <UserDetailContent
          user={data.user as UserDetail}
          onRefresh={refresh}
          resetResult={resetResult}
          setResetResult={setResetResult}
        />
      )}
    </QueryState>
  );
}

function UserDetailContent({
  user: u,
  onRefresh,
  resetResult,
  setResetResult,
}: {
  user: UserDetail;
  onRefresh: () => Promise<void>;
  resetResult: string | null;
  setResetResult: (v: string | null) => void;
}) {
  const isBanned = u.accountStatus === "BANNED";
  const merchantUrl = import.meta.env.VITE_MERCHANT_ADMIN_URL ?? "http://localhost:3001";

  async function patch(body: Record<string, unknown>) {
    await api.updateUser(u.id, body);
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <Link to="/users" className="text-sm text-slate-500 hover:text-sky-600">
        ← Users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{u.email}</h1>
          {u.name ? <p className="text-slate-600">{u.name}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {u.role !== "SUPER_ADMIN" ? (
            <button
              type="button"
              className="ugclab-btn ugclab-btn-primary text-sm"
              onClick={async () => {
                const { url } = await api.impersonateUser(u.id);
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              Impersonate (new tab)
            </button>
          ) : null}
          <button
            type="button"
            className="ugclab-btn border border-slate-200 bg-white text-sm"
            onClick={async () => {
              if (!confirm(`Reset password for ${u.email}?`)) return;
              const r = await api.resetUserPassword(u.id);
              if (r.temporaryPassword) {
                setResetResult(
                  `Email not sent. Temporary password: ${r.temporaryPassword}`
                );
              } else {
                setResetResult("Password reset email sent.");
              }
              await onRefresh();
            }}
          >
            Reset password
          </button>
          <button
            type="button"
            className="ugclab-btn border border-slate-200 bg-white text-sm"
            onClick={async () => {
              if (!confirm(`Revoke all sessions for ${u.email}?`)) return;
              await api.revokeUserSessions(u.id);
              await onRefresh();
            }}
          >
            Revoke sessions
          </button>
        </div>
      </div>

      {resetResult ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {resetResult}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Role" value={u.role} />
        <Stat
          label="Status"
          value={u.accountStatus}
          tone={isBanned ? "text-red-600" : "text-emerald-600"}
        />
        <Stat label="2FA" value={u.totpEnabled ? "Enabled" : "Off"} />
        <Stat
          label="Last login"
          value={
            u.lastLoginAt
              ? new Date(u.lastLoginAt).toLocaleString()
              : "Never"
          }
        />
      </div>

      <PlatformNotes entityType="user" entityId={u.id} />

      <section className="platform-card p-6 space-y-4 text-sm">
        <h2 className="font-semibold">Account controls</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-xs text-slate-500">Role</span>
            <select
              className="ugclab-select mt-1 min-w-[10rem]"
              value={u.role}
              onChange={(e) => patch({ role: e.target.value })}
            >
              <option value="MERCHANT">MERCHANT</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="PLATFORM_OPS">PLATFORM_OPS</option>
              <option value="PLATFORM_SUPPORT">PLATFORM_SUPPORT</option>
              <option value="PLATFORM_FINANCE">PLATFORM_FINANCE</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Account status</span>
            <select
              className="ugclab-select mt-1 min-w-[10rem]"
              value={u.accountStatus}
              onChange={(e) => patch({ accountStatus: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="BANNED">BANNED</option>
            </select>
          </label>
          {["SUPER_ADMIN", "PLATFORM_OPS", "PLATFORM_SUPPORT", "PLATFORM_FINANCE"].includes(
            u.role
          ) ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={u.requireAdmin2fa}
                onChange={(e) => patch({ requireAdmin2fa: e.target.checked })}
              />
              <span>Require 2FA for platform admin</span>
            </label>
          ) : null}
        </div>
        <p className="text-slate-500">
          Password set: {u.hasPassword ? "Yes" : "No"} · Session version:{" "}
          {u.sessionVersion} · Country: {u.country ?? "—"} · Timezone: {u.timezone}
        </p>
        {u.bannedAt ? (
          <p className="text-red-700">Banned at {new Date(u.bannedAt).toLocaleString()}</p>
        ) : null}
      </section>

      {u.oauthAccounts.length > 0 ? (
        <section className="platform-card p-6">
          <h2 className="font-semibold">OAuth</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {u.oauthAccounts.map((a) => (
              <li key={`${a.provider}-${a.providerAccountId}`}>
                <span className="font-medium capitalize">{a.provider}</span>
                <span className="text-slate-500"> · {a.providerAccountId}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="platform-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Stores owned</h2>
        {u.ownedStores.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No owned stores</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {u.ownedStores.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-3">
                    <Link to={`/tenants/${s.id}`} className="font-medium text-sky-600">
                      {s.name}
                    </Link>
                    <p className="font-mono text-xs text-slate-400">{s.slug}</p>
                  </td>
                  <td className="px-6 py-3">{s.status}</td>
                  <td className="px-6 py-3 text-right">
                    <a
                      href={s.storefrontUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600"
                    >
                      Storefront ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {u.memberships.length > 0 ? (
        <section className="platform-card overflow-hidden">
          <h2 className="border-b px-6 py-4 font-semibold">Staff memberships</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {u.memberships.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-3">
                    <Link
                      to={`/tenants/${m.tenant.id}`}
                      className="font-medium text-sky-600"
                    >
                      {m.tenant.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{m.role}</td>
                  <td className="px-6 py-3 text-slate-500">{m.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="platform-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Platform audit (recent)</h2>
          <Link to="/activity" className="text-sm text-sky-600">
            Platform activity →
          </Link>
        </div>
        {u.recentPlatformAudit.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No platform actions yet</p>
        ) : (
          <ul className="divide-y text-sm">
            {u.recentPlatformAudit.map((a) => (
              <li key={a.id} className="px-6 py-3">
                <p className="font-medium">{a.summary}</p>
                <p className="text-xs text-slate-500">
                  {a.actorEmail} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {u.role === "MERCHANT" ? (
        <section className="platform-card p-6 space-y-3 text-sm">
          <h2 className="font-semibold">GDPR</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="ugclab-btn border border-slate-200 bg-white text-sm"
              onClick={async () => {
                const data = await api.gdprExport(u.id);
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `user-${u.id}-export.json`;
                a.click();
              }}
            >
              Export data
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700"
              onClick={async () => {
                if (!confirm("Permanently anonymize this user?")) return;
                await api.gdprDelete(u.id);
                alert("User anonymized");
                await onRefresh();
              }}
            >
              Delete (anonymize)
            </button>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        Impersonation opens merchant admin at {merchantUrl} in a new tab (5 min
        link, logged in audit).
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="platform-stat">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
