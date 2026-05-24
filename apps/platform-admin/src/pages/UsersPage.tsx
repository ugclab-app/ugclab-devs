import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

function RoleBadge({ role }: { role: string }) {
  if (role === "SUPER_ADMIN") {
    return (
      <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
        {role}
      </span>
    );
  }
  return <span className="text-slate-700">{role}</span>;
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const role = params.get("role") ?? "";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex gap-2">
        <button
          type="button"
          className="ugclab-btn border border-slate-200 bg-white text-sm"
          onClick={async () => {
            const email = window.prompt("Staff email:");
            if (!email) return;
            const role =
              window.prompt(
                "Role: SUPER_ADMIN | PLATFORM_OPS | PLATFORM_SUPPORT | PLATFORM_FINANCE",
                "PLATFORM_OPS"
              ) ?? "PLATFORM_OPS";
            const r = (await api.inviteStaff(email, role)) as {
              temporaryPassword?: string;
            };
            alert(
              r.temporaryPassword
                ? `Created. Temp password: ${r.temporaryPassword}`
                : "Invite sent by email"
            );
          }}
        >
          Invite staff
        </button>
        <button
          type="button"
          onClick={() => api.exportUsersCsv().catch((e) => alert(String(e)))}
          className="ugclab-btn border border-slate-200 bg-white text-sm"
        >
          Export CSV
        </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search email or name…"
          defaultValue={q}
          className="ugclab-input max-w-md"
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
          className="ugclab-select w-44"
        >
          <option value="">All roles</option>
          <option value="MERCHANT">Merchants</option>
          <option value="SUPER_ADMIN">Super admins</option>
        </select>
      </div>

      <QueryState query={query}>
        {() => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Stores</th>
                  <th className="px-6 py-3">Last login</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{u.email}</p>
                      {u.name ? (
                        <p className="text-xs text-slate-400">{u.name}</p>
                      ) : null}
                      {u.totpEnabled ? (
                        <p className="text-xs text-emerald-600">2FA on</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          u.accountStatus === "BANNED"
                            ? "text-red-700 font-medium"
                            : "text-slate-600"
                        }
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.stores.length === 0 ? (
                        "0"
                      ) : (
                        <div className="space-y-0.5">
                          {u.stores.map((s) => (
                            <Link
                              key={s.id}
                              to={`/tenants/${s.id}`}
                              className="block text-sky-600 hover:underline"
                            >
                              {s.slug}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-semibold text-sky-600"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                      No users found
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
