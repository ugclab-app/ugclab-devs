import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ModerationPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["moderation"], queryFn: () => api.moderation() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation</h1>
      <QueryState query={query}>
        {(data) => (
          <ul className="platform-card divide-y">
            {(data.pendingReviews as {
              id: string;
              tenantName: string;
              productTitle: string;
              authorName: string;
              rating: number;
              body?: string;
            }[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="text-sm">
                  <strong>{r.tenantName}</strong> · {r.productTitle} · {r.rating}★ by {r.authorName}
                  {r.body ? <p className="mt-1 text-slate-500">{r.body}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary text-xs"
                    onClick={async () => {
                      await api.moderateReview(r.id, true);
                      await qc.invalidateQueries({ queryKey: ["moderation"] });
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1 text-xs text-red-700"
                    onClick={async () => {
                      await api.moderateReview(r.id, false);
                      await qc.invalidateQueries({ queryKey: ["moderation"] });
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
            {data.pendingReviews.length === 0 ? (
              <li className="px-6 py-8 text-center text-slate-500">No pending reviews</li>
            ) : null}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
