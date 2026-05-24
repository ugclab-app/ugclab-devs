import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.announcements(),
  });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <p className="text-sm text-slate-500">
        Banner shown in merchant admin for matching plans (empty plan list = all).
      </p>

      <section className="platform-card p-6 space-y-3">
        <h2 className="font-semibold">New announcement</h2>
        <input
          className="ugclab-input w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="ugclab-input w-full"
          rows={3}
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={async () => {
            await api.createAnnouncement({ title, message, active: false });
            setTitle("");
            setMessage("");
            await qc.invalidateQueries({ queryKey: ["announcements"] });
          }}
        >
          Create draft
        </button>
      </section>

      <QueryState query={query}>
        {(data) => (
          <ul className="space-y-4">
            {(data.announcements as {
              id: string;
              title: string;
              message: string;
              active: boolean;
              planSlugs: string[];
            }[]).map((a) => (
              <li key={a.id} className="platform-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{a.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Plans: {a.planSlugs.length ? a.planSlugs.join(", ") : "all"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={a.active}
                      onChange={(e) =>
                        api
                          .updateAnnouncement(a.id, { active: e.target.checked })
                          .then(() =>
                            qc.invalidateQueries({ queryKey: ["announcements"] })
                          )
                      }
                    />
                    Active
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
