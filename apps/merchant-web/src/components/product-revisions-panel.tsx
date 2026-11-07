import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function ProductRevisionsPanel({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["product-revisions", productId],
    queryFn: () => api.productRevisions(productId),
  });
  const restore = useMutation({
    mutationFn: (revisionId: string) =>
      api.restoreProductRevision(productId, revisionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["product", productId] });
      void qc.invalidateQueries({ queryKey: ["product-revisions", productId] });
      window.location.reload();
    },
  });

  const revisions = data?.revisions ?? [];
  if (!revisions.length) return null;

  return (
    <div className="admin-card mt-6 space-y-3 p-4">
      <h3 className="font-semibold text-zinc-900">Change history</h3>
      <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
        {revisions.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2"
          >
            <div>
              <p className="font-medium text-zinc-800">
                {r.summary ?? "Snapshot"} ·{" "}
                {typeof r.snapshot.title === "string" ? r.snapshot.title : ""}
              </p>
              <p className="text-[11px] text-zinc-400">
                {r.authorEmail ?? "staff"} · {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="text-violet-700 hover:underline"
              disabled={restore.isPending}
              onClick={() => {
                if (confirm("Restore this revision?")) restore.mutate(r.id);
              }}
            >
              Rollback
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
