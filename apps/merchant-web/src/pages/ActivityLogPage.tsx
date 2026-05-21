import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { EmptyState } from "@/components/empty-state";

export default function ActivityLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: () => api.activityLog(),
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  const logs = (data?.logs ?? []) as {
    id: string;
    userEmail: string;
    action: string;
    summary: string;
    createdAt: string;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity log</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Who changed products, settings, and team permissions.
        </p>
      </div>
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions will appear here." />
      ) : (
        <ul className="admin-card divide-y">
          {logs.map((log) => (
            <li key={log.id} className="px-6 py-4">
              <p className="text-sm font-medium text-zinc-900">{log.summary}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {log.userEmail} · {log.action} ·{" "}
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
