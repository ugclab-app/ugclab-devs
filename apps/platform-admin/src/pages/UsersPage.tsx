import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { QueryState } from "@/components/query-state";
import { roleLabel } from "@/lib/platform-permissions";
import { usePlatformPermissions } from "@/hooks/use-platform-permissions";

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    SUPER_ADMIN: "bg-sky-100 text-sky-800",
    PLATFORM_OPS: "bg-violet-100 text-violet-800",
    PLATFORM_SUPPORT: "bg-emerald-100 text-emerald-800",
    PLATFORM_FINANCE: "bg-amber-100 text-amber-900",
    MERCHANT: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[role] ?? "bg-slate-100 text-slate-700"}`}
    >
      {roleLabel(role)}
    </span>
  );
}

export default function UsersPage() {
  const { role: myRole } = usePlatformPermissions();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const q = params.get("q") ?? "";
  const role = params.get("role") ?? "";
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [inviteAdminOpen, setInviteAdminOpen] = useState(false);

  const query = useQuery({
    queryKey: ["users", params.toString()],
    queryFn: () => api.users({ q: q || undefined, role: role || undefined }),
  });

  const users = (query.data?.users ?? []) as {
    id: string;
    email: string;
    name: string | null;
    role: string;
    accountStatus: string;
    totpEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    storeCount: number;
    stores: { id: string; name: string; slug: string }[];
  }[];

  return (
    <div className="space-y-6">
      <div className="platform-page-header">
        <div>
          <h1>Users</h1>
          <p className="mt-1 text-sm text-slate-500">Merchants and platform staff</p>
        </div>
        <div className="platform-toolbar">
          <PermissionGate permission="staff:invite">
            <button
              type="button"
              className="platform-btn-secondary"
              onClick={() => setInviteStaffOpen(true)}
            >
              Invite staff
            </button>
            {myRole === "SUPER_ADMIN" ? (
              <button
                type="button"
                className="platform-btn-secondary"
                onClick={() => setInviteAdminOpen(true)}
              >
                Invite super admin
              </button>
            ) : null}
          </PermissionGate>
          <button
            type="button"
            onClick={() => api.exportUsersCsv().catch((e) => alert(String(e)))}
            className="platform-btn-secondary"
          >
            Export CSV
          </button>
        </div>
      </div>

      <InviteUserDialog
        kind="staff"
        open={inviteStaffOpen}
        onClose={() => setInviteStaffOpen(false)}
        onSubmit={async ({ email, name, role: staffRole }) => {
          const r = (await api.inviteStaff(email, staffRole, name || undefined)) as {
            temporaryPassword?: string;
            emailSent?: boolean;
          };
          await qc.invalidateQueries({ queryKey: ["users"] });
          if (r.temporaryPassword) {
            return `Created. Temporary password: ${r.temporaryPassword}`;
          }
          return r.emailSent ? "Invite sent by email." : "User created.";
        }}
      />
      <InviteUserDialog
        kind="admin"
        open={inviteAdminOpen}
        onClose={() => setInviteAdminOpen(false)}
        onSubmit={async ({ email, name }) => {
          const r = (await api.inviteAdmin(email, name || undefined)) as {
            temporaryPassword?: string;
            emailSent?: boolean;
          };
          await qc.invalidateQueries({ queryKey: ["users"] });
          if (r.temporaryPassword) {
            return `Created. Temporary password: ${r.temporaryPassword}`;
          }
          return r.emailSent ? "Invite sent by email." : "Super admin created.";
        }}
      />

      <div className="platform-card flex flex-wrap gap-3 p-4">
        <input
          type="search"
          placeholder="Search email or name…"
          defaultValue={q}
          className="ugclab-input min-w-[16rem] flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value;
              const p = new URLSearchParams(params);
              if (v) p.set("q", v);
              else p.delete("q");
              setParams(p);
            }
          }}
        />
        <select
          value={role}
          onChange={(e) => {
            const p = new URLSearchParams(params);
            if (e.target.value) p.set("role", e.target.value);
            else p.delete("role");
            setParams(p);
          }}
          className="ugclab-select w-48"
        >
          <option value="">All roles</option>
          <option value="MERCHANT">Merchants</option>
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="PLATFORM_OPS">Operations</option>
          <option value="PLATFORM_SUPPORT">Support</option>
          <option value="PLATFORM_FINANCE">Finance</option>
        </select>
      </div>

      <QueryState query={query}>
        {() => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Stores</th>
                  <th className="px-6 py-3">Last login</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{u.email}</p>
                      {u.name ? <p className="text-xs text-slate-500">{u.name}</p> : null}
                      {u.totpEnabled ? (
                        <span className="mt-1 inline-block text-xs font-medium text-emerald-600">
                          2FA enabled
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          u.accountStatus === "BANNED"
                            ? "font-medium text-red-700"
                            : "text-slate-600"
                        }
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.stores.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {u.stores.slice(0, 2).map((s) => (
                            <Link
                              key={s.id}
                              to={`/tenants/${s.id}`}
                              className="block text-sky-600 hover:underline"
                            >
                              {s.slug}
                            </Link>
                          ))}
                          {u.stores.length > 2 ? (
                            <span className="text-xs text-slate-400">+{u.stores.length - 2}</span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/users/${u.id}`} className="font-semibold text-sky-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No users match your filters
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
