import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

type Metafield = {
  id: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
};

export function ProductMetafieldsEditor({
  productId,
}: {
  productId: string;
}) {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["metafields", "PRODUCT", productId],
    queryFn: () => api.metafields("PRODUCT", productId),
    enabled: !!productId,
  });

  const metafields = (data?.metafields ?? []) as Metafield[];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setAlert({});
    const fd = new FormData(e.currentTarget);
    try {
      await api.putMetafield({
        ownerType: "PRODUCT",
        ownerId: productId,
        namespace: String(fd.get("namespace") ?? "custom") || "custom",
        key: String(fd.get("key") ?? ""),
        type: String(fd.get("type") ?? "single_line_text"),
        value: String(fd.get("value") ?? ""),
      });
      (e.target as HTMLFormElement).reset();
      setAlert({ ok: true, message: "Metafield saved" });
      await qc.invalidateQueries({
        queryKey: ["metafields", "PRODUCT", productId],
      });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this metafield?")) return;
    setPending(true);
    try {
      await api.deleteMetafield(id);
      await qc.invalidateQueries({
        queryKey: ["metafields", "PRODUCT", productId],
      });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-card space-y-4 p-5">
      <h2 className="font-semibold">Product metafields</h2>
      <FormAlert ok={alert.ok} message={alert.message} />
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : metafields.length === 0 ? (
        <p className="text-sm text-zinc-500">No metafields yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {metafields.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 px-3 py-2"
            >
              <div>
                <span className="font-mono text-xs text-zinc-500">
                  {m.namespace}.{m.key}
                </span>
                <p className="mt-0.5">{m.value}</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => void remove(m.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void save(e)} className="grid gap-2 sm:grid-cols-2">
        <input
          name="namespace"
          placeholder="namespace"
          defaultValue="custom"
          className="ugclab-input"
        />
        <input name="key" required placeholder="key" className="ugclab-input" />
        <select name="type" className="ugclab-select" defaultValue="single_line_text">
          <option value="single_line_text">Text</option>
          <option value="number_integer">Integer</option>
          <option value="boolean">Boolean</option>
          <option value="json">JSON</option>
        </select>
        <input name="value" required placeholder="value" className="ugclab-input" />
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary text-sm sm:col-span-2"
        >
          Save metafield
        </button>
      </form>
    </div>
  );
}
