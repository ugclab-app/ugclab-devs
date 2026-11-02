import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
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
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mine, setMine] = useState(false);
  const query = useQuery({ queryKey: ["inbox"], queryFn: () => api.inbox() });
  const staff = useQuery({ queryKey: ["inbox-staff"], queryFn: () => api.inboxStaff() });
  const assigned = useQuery({ queryKey: ["inbox-assignments"], queryFn: () => api.inboxAssignments() });
  const save = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => api.assignInbox(id, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-assignments"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-slate-500">Unified action queue for platform operations.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Assigned to me
        </label>
      </div>
      {save.error ? <p className="text-sm text-red-600">{(save.error as Error).message}</p> : null}
      <QueryState query={query}>
        {(data) => {
          const items = (data.items as Item[]).filter((item) => {
            if (!mine || !user) return true;
            return assigned.data?.assignments[item.id] === user.email;
          });
          return (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="platform-card flex items-start justify-between gap-4 p-4">
                  <Link to={item.href} className={`min-w-0 flex-1 ${item.priority === "high" ? "border-l-4 border-l-red-500 pl-3" : ""}`}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    {item.count != null ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{item.count}</span>
                    ) : null}
                    <select
                      className="ugclab-input text-sm"
                      value={assigned.data?.assignments[item.id] ?? ""}
                      onChange={(e) => save.mutate({ id: item.id, email: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {(staff.data?.staff ?? []).map((person) => (
                        <option key={person.id} value={person.email}>
                          {person.name || person.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
              {items.length === 0 ? <li className="platform-card p-8 text-center text-slate-500">All clear</li> : null}
            </ul>
          );
        }}
      </QueryState>
    </div>
  );
}
