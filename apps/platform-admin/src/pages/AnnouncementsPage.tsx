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
  const plansQ = useQuery({ queryKey: ["plans"], queryFn: () => api.plans() });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [planSlugs, setPlanSlugs] = useState("");
  const [tenantIds, setTenantIds] = useState("");

  const plans = (plansQ.data?.plans ?? []) as { slug: string; name: string }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <p className="text-sm text-slate-500">
        In-app banner in merchant admin. Empty plans + tenants = all matching merchants.
      </p>

      <section className="platform-card space-y-3 p-6">
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
        <label className="block text-sm">
          <span className="text-slate-600">Plan slugs (comma-separated, empty = all plans)</span>
          <input
            className="ugclab-input mt-1 w-full font-mono text-sm"
            placeholder="starter, pro"
            value={planSlugs}
            onChange={(e) => setPlanSlugs(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Tenant IDs (comma-separated, empty = not restricted)</span>
          <input
            className="ugclab-input mt-1 w-full font-mono text-sm"
            placeholder="cuid1, cuid2"
            value={tenantIds}
            onChange={(e) => setTenantIds(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={async () => {
            await api.createAnnouncement({
              title,
              message,
              active: false,
              planSlugs: planSlugs
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              tenantIds: tenantIds
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
            setTitle("");
            setMessage("");
            setPlanSlugs("");
            setTenantIds("");
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
              tenantIds: string[];
            }[]).map((a) => (
              <li key={a.id} className="platform-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{a.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Plans: {a.planSlugs.length ? a.planSlugs.join(", ") : "all"} · Tenants:{" "}
                      {a.tenantIds?.length ? a.tenantIds.join(", ") : "any"}
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
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-sky-600">Edit targeting</summary>
                  <form
                    className="mt-2 space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await api.updateAnnouncement(a.id, {
                        planSlugs: String(fd.get("planSlugs") ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        tenantIds: String(fd.get("tenantIds") ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      });
                      await qc.invalidateQueries({ queryKey: ["announcements"] });
                    }}
                  >
                    <input
                      name="planSlugs"
                      className="ugclab-input w-full font-mono text-xs"
                      defaultValue={a.planSlugs.join(", ")}
                      placeholder="plan slugs"
                    />
                    <input
                      name="tenantIds"
                      className="ugclab-input w-full font-mono text-xs"
                      defaultValue={(a.tenantIds ?? []).join(", ")}
                      placeholder="tenant ids"
                    />
                    <button type="submit" className="text-xs text-sky-600">
                      Save targeting
                    </button>
                  </form>
                  {plans.length ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Available plans: {plans.map((p) => p.slug).join(", ")}
                    </p>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
