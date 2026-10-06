import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ModerationPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["moderation-queue"],
    queryFn: () => api.moderationQueue(),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Moderation</h1>

      <QueryState query={query}>
        {(raw) => {
          const data = raw as {
            pendingReviews: {
              id: string;
              tenantName: string;
              productTitle: string;
              authorName: string;
              rating: number;
              body?: string;
            }[];
            recentProducts: {
              id: string;
              tenantId: string;
              tenantName: string;
              title: string;
            }[];
            unpublishedPages: {
              id: string;
              tenantId: string;
              tenantName: string;
              title: string;
              slug: string;
            }[];
            publishedPages?: {
              id: string;
              tenantId: string;
              tenantName: string;
              title: string;
              slug: string;
            }[];
            flaggedTenants: {
              id: string;
              name: string;
              slug: string;
              platformFlags: string[];
            }[];
          };
          return (
          <>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Pending reviews</h2>
              <ul className="platform-card divide-y">
                {(data.pendingReviews as {
                  id: string;
                  tenantName: string;
                  productTitle: string;
                  authorName: string;
                  rating: number;
                  body?: string;
                }[]).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="text-sm">
                      <strong>{r.tenantName}</strong> · {r.productTitle} · {r.rating}★ by{" "}
                      {r.authorName}
                      {r.body ? <p className="mt-1 text-slate-500">{r.body}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="ugclab-btn ugclab-btn-primary text-xs"
                        onClick={async () => {
                          await api.moderateReview(r.id, true);
                          await qc.invalidateQueries({ queryKey: ["moderation-queue"] });
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-1 text-xs text-red-700"
                        onClick={async () => {
                          await api.moderateReview(r.id, false);
                          await qc.invalidateQueries({ queryKey: ["moderation-queue"] });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
                {!data.pendingReviews.length ? (
                  <li className="px-6 py-8 text-center text-slate-500">No pending reviews</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Recent products</h2>
              <ul className="platform-card divide-y text-sm">
                {(data.recentProducts as {
                  id: string;
                  tenantId: string;
                  tenantName: string;
                  title: string;
                }[]).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-6 py-3">
                    <span>
                      <Link to={`/tenants/${p.tenantId}`} className="text-sky-600">
                        {p.tenantName}
                      </Link>{" "}
                      · {p.title}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() =>
                        api.banProduct(p.id).then(() =>
                          qc.invalidateQueries({ queryKey: ["moderation-queue"] })
                        )
                      }
                    >
                      Archive
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Published CMS pages</h2>
              <ul className="platform-card divide-y text-sm">
                {(data.publishedPages as {
                  id: string;
                  tenantId: string;
                  tenantName: string;
                  title: string;
                  slug: string;
                }[] | undefined)?.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-6 py-3">
                    <span>
                      <Link to={`/tenants/${p.tenantId}`} className="text-sky-600">
                        {p.tenantName}
                      </Link>{" "}
                      · {p.title}{" "}
                      <span className="font-mono text-xs text-slate-500">{p.slug}</span>
                    </span>
                    <button
                      type="button"
                      className="text-xs text-amber-700 hover:underline"
                      onClick={() =>
                        api.unpublishPage(p.id).then(() =>
                          qc.invalidateQueries({ queryKey: ["moderation-queue"] })
                        )
                      }
                    >
                      Unpublish
                    </button>
                  </li>
                ))}
                {!(data.publishedPages as unknown[] | undefined)?.length ? (
                  <li className="px-6 py-6 text-center text-slate-500">No published pages</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Draft / unpublished CMS pages</h2>
              <ul className="platform-card divide-y text-sm">
                {(data.unpublishedPages as {
                  id: string;
                  tenantId: string;
                  tenantName: string;
                  title: string;
                  slug: string;
                }[]).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-6 py-3">
                    <span>
                      <Link to={`/tenants/${p.tenantId}`} className="text-sky-600">
                        {p.tenantName}
                      </Link>{" "}
                      · {p.title}{" "}
                      <span className="font-mono text-xs text-slate-500">{p.slug}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Flagged stores</h2>
              <ul className="platform-card divide-y text-sm">
                {(data.flaggedTenants as {
                  id: string;
                  name: string;
                  slug: string;
                  platformFlags: string[];
                }[]).map((t) => (
                  <li key={t.id} className="px-6 py-3">
                    <Link to={`/tenants/${t.id}`} className="font-medium text-sky-600">
                      {t.name}
                    </Link>
                    <span className="ml-2 text-xs text-amber-700">
                      {t.platformFlags.join(", ")}
                    </span>
                  </li>
                ))}
                {!data.flaggedTenants.length ? (
                  <li className="px-6 py-6 text-slate-500">No flagged stores</li>
                ) : null}
              </ul>
            </section>
          </>
          );
        }}
      </QueryState>
    </div>
  );
}
