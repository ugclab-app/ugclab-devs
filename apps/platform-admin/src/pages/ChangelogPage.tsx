import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ChangelogPage() {
  const query = useQuery({ queryKey: ["changelog"], queryFn: () => api.changelog() });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">What shipped</h1>
        <p className="mt-1 text-sm text-slate-500">Announcements already sent to merchants, newest first.</p>
      </div>
      <QueryState query={query}>
        {(data) => (
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li key={item.id} className="platform-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.title}</p>
                  <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.message}</p>
                {item.active ? <p className="mt-2 text-xs font-medium text-emerald-700">Showing now</p> : null}
              </li>
            ))}
            {data.items.length === 0 ? <li className="text-sm text-slate-500">No announcements yet.</li> : null}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
