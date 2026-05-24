import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type Item = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  count?: number;
};

export default function InboxPage() {
  const query = useQuery({ queryKey: ["inbox"], queryFn: () => api.inbox() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inbox</h1>
      <p className="text-sm text-slate-500">Unified action queue for platform operations.</p>
      <QueryState query={query}>
        {(data) => (
          <ul className="space-y-3">
            {(data.items as Item[]).map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className={`platform-card flex items-start justify-between gap-4 p-4 transition hover:border-sky-300 ${
                    item.priority === "high" ? "border-l-4 border-l-red-500" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>
                  {item.count != null ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
            {data.items.length === 0 ? (
              <li className="platform-card p-8 text-center text-slate-500">All clear</li>
            ) : null}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
