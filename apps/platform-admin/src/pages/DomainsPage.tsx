import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function DomainsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["domains"], queryFn: () => api.domains() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Custom domains</h1>
      <QueryState query={query}>
        {(data) => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Store</th>
                  <th className="px-6 py-3">Verified</th>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.domains as {
                  id: string;
                  domain: string;
                  verified: boolean;
                  verificationToken: string;
                  tenantId: string;
                  tenantName: string;
                }[]).map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-3 font-mono">{d.domain}</td>
                    <td className="px-6 py-3">
                      <Link to={`/tenants/${d.tenantId}`} className="text-sky-600">
                        {d.tenantName}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      {d.verified ? (
                        <span className="text-emerald-600">Yes</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 font-mono text-xs text-slate-500">
                      {d.verificationToken}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {!d.verified ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-sky-600"
                          onClick={() =>
                            api.verifyDomain(d.id).then(() =>
                              qc.invalidateQueries({ queryKey: ["domains"] })
                            )
                          }
                        >
                          Mark verified
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
