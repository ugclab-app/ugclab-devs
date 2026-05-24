import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const query = useQuery({
    queryKey: ["audit", action, actor],
    queryFn: () => api.audit({ action: action || undefined, actor: actor || undefined }),
  });

  const logs = (query.data?.logs ?? []) as {
    id: string;
    actorEmail: string;
    action: string;
    summary: string;
    targetUserId: string | null;
    createdAt: string;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform audit log</h1>
      <div className="flex flex-wrap gap-3">
        <input
          className="ugclab-input max-w-xs"
          placeholder="Filter action…"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="ugclab-input max-w-xs"
          placeholder="Filter actor email…"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
        />
      </div>
      <QueryState query={query}>
        {() => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{l.action}</td>
                    <td className="px-6 py-3">{l.actorEmail}</td>
                    <td className="px-6 py-3">{l.summary}</td>
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
