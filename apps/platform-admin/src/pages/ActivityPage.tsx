import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ActivityPage() {
  const [params] = useSearchParams();
  const tenantId = params.get("tenantId") ?? undefined;

  const query = useQuery({
    queryKey: ["platform-activity", tenantId],
    queryFn: () => api.activity(tenantId),
  });

  const logs = (query.data?.logs ?? []) as {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    userEmail: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    summary: string | null;
    createdAt: string;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recent merchant actions across all stores.
          {tenantId ? " Filtered to one store." : ""}
        </p>
      </div>

      <QueryState query={query}>
        {() => (
        <div className="platform-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      to={`/tenants/${l.tenantId}`}
                      className="font-medium text-sky-600"
                    >
                      {l.tenantName}
                    </Link>
                    <p className="text-xs text-slate-400">{l.tenantSlug}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{l.userEmail ?? "—"}</td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs">{l.action}</span>
                    {l.entityType ? (
                      <p className="text-xs text-slate-400">
                        {l.entityType}
                        {l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="max-w-md px-6 py-3 text-slate-600">
                    {l.summary ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No activity yet
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
