import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["users", q],
    queryFn: () => api.users(q || undefined),
  });

  const users = (data?.users ?? []) as {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    _count: { tenants: number };
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <input
        type="search"
        placeholder="Search email or name…"
        className="ugclab-input max-w-md"
        onKeyDown={(e) => {
          if (e.key === "Enter") setQ((e.target as HTMLInputElement).value);
        }}
      />
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="platform-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Stores owned</th>
                <th className="px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium">{u.email}</p>
                    {u.name ? <p className="text-xs text-slate-400">{u.name}</p> : null}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        u.role === "SUPER_ADMIN"
                          ? "rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"
                          : ""
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{u._count.tenants}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
