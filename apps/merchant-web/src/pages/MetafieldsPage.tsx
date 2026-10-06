import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { ProductMetafieldsEditor } from "@/components/product-metafields-editor";

type Definition = {
  id: string;
  type: string;
  name: string;
  metaobjects?: Metaobject[];
};

type Metaobject = {
  id: string;
  handle: string;
  fields: Record<string, unknown>;
};

export default function MetafieldsPage() {
  const [params] = useSearchParams();
  const productId = params.get("productId") ?? "";
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["metaobjects"],
    queryFn: () => api.metaobjects(),
  });

  const definitions = (data?.definitions ?? []) as Definition[];

  async function run(fn: () => Promise<unknown>, message: string) {
    setPending(true);
    setAlert({});
    try {
      await fn();
      setAlert({ ok: true, message });
      await qc.invalidateQueries({ queryKey: ["metaobjects"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Metafields" }]}
      title="Metafields & metaobjects"
      description="Define custom data types and edit product metafields."
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      {productId ? (
        <div className="mb-8">
          <ProductMetafieldsEditor productId={productId} />
        </div>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          Open with{" "}
          <code className="rounded bg-zinc-100 px-1">?productId=…</code> to edit
          product metafields, or use the editor on a product page.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.createMetaobjectDefinition({
                  type: String(fd.get("type") ?? ""),
                  name: String(fd.get("name") ?? ""),
                }),
              "Definition created"
            ).then(() => (e.target as HTMLFormElement).reset());
          }}
        >
          <h2 className="font-semibold">New metaobject definition</h2>
          <input
            name="type"
            required
            placeholder="type (e.g. size_chart)"
            className="ugclab-input w-full"
          />
          <input
            name="name"
            required
            placeholder="Display name"
            className="ugclab-input w-full"
          />
          <button
            type="submit"
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary text-sm"
          >
            Create definition
          </button>
        </form>

        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.createMetaobject({
                  definitionId: String(fd.get("definitionId") ?? ""),
                  handle: String(fd.get("handle") ?? ""),
                  fields: {},
                }),
              "Metaobject created"
            ).then(() => (e.target as HTMLFormElement).reset());
          }}
        >
          <h2 className="font-semibold">New metaobject</h2>
          <select name="definitionId" required className="ugclab-select w-full">
            <option value="">Select definition</option>
            {definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type})
              </option>
            ))}
          </select>
          <input
            name="handle"
            required
            placeholder="handle"
            className="ugclab-input w-full"
          />
          <button
            type="submit"
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary text-sm"
          >
            Create metaobject
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Definitions & entries</h2>
        {isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : definitions.length === 0 ? (
          <p className="text-sm text-zinc-500">No definitions yet.</p>
        ) : (
          definitions.map((d) => (
            <div key={d.id} className="admin-card p-5 space-y-3">
              <p className="font-semibold">
                {d.name}{" "}
                <span className="font-mono text-xs font-normal text-zinc-500">
                  {d.type}
                </span>
              </p>
              {(d.metaobjects ?? []).length === 0 ? (
                <p className="text-sm text-zinc-400">No entries</p>
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {(d.metaobjects ?? []).map((m) => (
                    <li key={m.id} className="px-3 py-2 space-y-2">
                      <p className="font-mono text-xs">{m.handle}</p>
                      <form
                        className="flex flex-wrap gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const raw = String(fd.get("fields") ?? "{}");
                          let fields: unknown = {};
                          try {
                            fields = JSON.parse(raw);
                          } catch {
                            setAlert({
                              ok: false,
                              message: "Invalid JSON fields",
                            });
                            return;
                          }
                          void run(
                            () => api.patchMetaobject(m.id, { fields }),
                            "Metaobject updated"
                          );
                        }}
                      >
                        <textarea
                          name="fields"
                          rows={2}
                          defaultValue={JSON.stringify(m.fields ?? {}, null, 0)}
                          className="ugclab-input flex-1 min-w-[12rem] font-mono text-xs"
                        />
                        <button
                          type="submit"
                          disabled={pending}
                          className="ugclab-btn border border-zinc-200 bg-white text-xs"
                        >
                          Save
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </AdminPageShell>
  );
}
