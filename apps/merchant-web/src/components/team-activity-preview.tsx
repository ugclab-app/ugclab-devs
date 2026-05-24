import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function TeamActivityPreview() {
  const { data } = useQuery({
    queryKey: ["activity-log", "recent"],
    queryFn: () => api.activityLog(8),
  });

  const logs = (data?.logs ?? []) as {
    id: string;
    summary: string;
    userEmail: string;
    createdAt: string;
  }[];

  if (logs.length === 0) return null;

  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">Recent team actions</h3>
        <Link to="/activity-log" className="text-sm text-violet-600 hover:underline">
          View all
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-zinc-100 text-sm">
        {logs.map((log) => (
          <li key={log.id} className="py-2.5">
            <p className="text-zinc-800">{log.summary}</p>
            <p className="text-xs text-zinc-500">
              {log.userEmail} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
