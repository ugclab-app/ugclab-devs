import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";

type Row = {
  id: string;
  title: string;
  priceAmount: number;
  compareAt: number | null;
  inventory: number | null;
  sku: string | null;
  seoTitle: string;
  seoDescription: string;
  dirty: boolean;
};

function seoFromProduct(p: Record<string, unknown>): { seoTitle: string; seoDescription: string } {
  const tr = p.translations;
  if (!tr || typeof tr !== "object" || Array.isArray(tr)) {
    return { seoTitle: "", seoDescription: "" };
  }
  const seo = (tr as Record<string, unknown>)._seo;
  if (!seo || typeof seo !== "object" || Array.isArray(seo)) {
    return { seoTitle: "", seoDescription: "" };
  }
  const s = seo as Record<string, unknown>;
  return {
    seoTitle: typeof s.seoTitle === "string" ? s.seoTitle : "",
    seoDescription: typeof s.seoDescription === "string" ? s.seoDescription : "",
  };
}

export default function ProductsBulkEditPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const q = useMemo(() => {
    const p = new URLSearchParams(params);
    if (!p.has("limit")) p.set("limit", "50");
    return p;
  }, [params]);
  const { data, isLoading } = useQuery({
    queryKey: ["products-bulk", q.toString()],
    queryFn: () => api.products(q),
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  useEffect(() => {
    const products = (data?.products ?? []) as Array<Record<string, unknown>>;
    const key = q.toString() + ":" + products.map((p) => p.id).join(",");
    if (!data || key === loadedKey) return;
    setLoadedKey(key);
    setRows(
      products.map((p) => {
        const seo = seoFromProduct(p);
        return {
          id: String(p.id),
          title: String(p.title ?? ""),
          priceAmount: Number(p.priceAmount ?? 0),
          compareAt: p.compareAt == null ? null : Number(p.compareAt),
          inventory: p.inventory == null ? null : Number(p.inventory),
          sku: p.sku == null ? null : String(p.sku),
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          dirty: false,
        };
      })
    );
  }, [data, q, loadedKey]);

  const save = useMutation({
    mutationFn: () =>
      api.bulkProductPatch(
        (rows ?? [])
          .filter((r) => r.dirty)
          .map((r) => ({
            id: r.id,
            title: r.title,
            priceAmount: r.priceAmount,
            compareAt: r.compareAt,
            inventory: r.inventory,
            sku: r.sku,
            seoTitle: r.seoTitle || null,
            seoDescription: r.seoDescription || null,
          }))
      ),
    onSuccess: (res) => {
      setAlert({ ok: true, message: `Saved ${res.updated} products` });
      setRows((prev) => prev?.map((r) => ({ ...r, dirty: false })) ?? null);
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) =>
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Save failed" }),
  });

  function patch(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r))
    );
  }

  const dirtyCount = rows?.filter((r) => r.dirty).length ?? 0;

  return (
    <AdminPageShell
      crumbs={[
        { label: "Products", to: "/products" },
        { label: "Bulk edit" },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bulk edit</h1>
          <p className="text-sm text-zinc-500">
            Edit prices, stock, SKU and SEO like a spreadsheet. Save writes only dirty rows.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/products?trash=1" className="ugclab-btn ugclab-btn-secondary text-sm">
            Trash
          </Link>
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary text-sm"
            disabled={!dirtyCount || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : `Save ${dirtyCount || ""}`.trim()}
          </button>
        </div>
      </div>
      <FormAlert ok={alert.ok} message={alert.message} />
      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Price (¢)</th>
                <th className="px-3 py-2">Compare (¢)</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">SEO title</th>
                <th className="px-3 py-2">SEO description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className={r.dirty ? "bg-amber-50/40" : undefined}>
                  <td className="px-3 py-1.5">
                    <input
                      className="ugclab-input w-full min-w-[10rem]"
                      value={r.title}
                      onChange={(e) => patch(r.id, { title: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className="ugclab-input w-24"
                      value={r.priceAmount}
                      onChange={(e) =>
                        patch(r.id, { priceAmount: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className="ugclab-input w-24"
                      value={r.compareAt ?? ""}
                      onChange={(e) =>
                        patch(r.id, {
                          compareAt: e.target.value === "" ? null : parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className="ugclab-input w-20"
                      value={r.inventory ?? ""}
                      onChange={(e) =>
                        patch(r.id, {
                          inventory:
                            e.target.value === "" ? null : parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="ugclab-input w-28 font-mono"
                      value={r.sku ?? ""}
                      onChange={(e) => patch(r.id, { sku: e.target.value || null })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="ugclab-input w-40"
                      value={r.seoTitle}
                      onChange={(e) => patch(r.id, { seoTitle: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="ugclab-input w-48"
                      value={r.seoDescription}
                      onChange={(e) => patch(r.id, { seoDescription: e.target.value })}
                    />
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
