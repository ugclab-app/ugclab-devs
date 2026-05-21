import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { EmptyState } from "@/components/empty-state";
import { AdminPageShell } from "@/components/admin-page-shell";
import { useAuth } from "@/context/auth";
import { getStorefrontUrl } from "@/lib/storefront";

const RULE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  AUTO_TAG: "By tag",
  AUTO_TYPE: "By type",
};

export default function CollectionsPage() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.collections(),
  });

  const collections = (data?.collections ?? []) as {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    ruleType: string;
    _count: { products: number };
  }[];

  const storefrontBase = tenant ? getStorefrontUrl(tenant.slug) : "";

  async function onDelete(id: string, title: string) {
    if (!confirm(`Delete collection “${title}”?`)) return;
    await api.deleteCollection(id);
    await queryClient.invalidateQueries({ queryKey: ["collections"] });
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Collections" }]}
      title="Collections"
      description="Group products for category pages on your storefront."
      actions={
        <Link to="/collections/new" className="ugclab-btn ugclab-btn-primary">
          New collection
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : collections.length === 0 ? (
        <EmptyState
          title="No collections"
          description="Group products into collections for your storefront."
          actionLabel="Create collection"
          actionHref="/collections/new"
        />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {collections.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/80">
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900">{c.title}</p>
                    {c.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                        {c.description.replace(/<[^>]+>/g, "").slice(0, 80)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {RULE_LABELS[c.ruleType] ?? c.ruleType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">{c.slug}</td>
                  <td className="px-6 py-4 text-zinc-600">{c._count.products}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {storefrontBase ? (
                        <a
                          href={`${storefrontBase.replace(/\/?$/, "")}/collections/${c.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-zinc-500 hover:text-violet-600"
                        >
                          View
                        </a>
                      ) : null}
                      <Link
                        to={`/collections/${c.id}`}
                        className="font-semibold text-violet-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id, c.title)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
