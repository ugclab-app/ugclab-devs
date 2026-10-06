import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

const FIELDS = [
  "title",
  "slug",
  "type",
  "status",
  "price",
  "inventory",
  "tags",
  "weight",
  "barcode",
  "description",
] as const;

type Preview = Awaited<ReturnType<typeof api.previewProductsCsv>>;

export function CsvImportPanel({
  onDone,
  onCancel,
}: {
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadPreview(nextFile: File, nextMapping?: Record<string, number>) {
    setBusy(true);
    setError("");
    try {
      const r = await api.previewProductsCsv(nextFile, nextMapping);
      setPreview(r);
      setMapping(r.mapping);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read CSV");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.importProductsCsv(file, mapping);
      const skipped = r.skipped ?? r.errors?.length ?? 0;
      await qc.invalidateQueries({ queryKey: ["products"] });
      onDone(
        `Imported ${r.created} product${r.created === 1 ? "" : "s"}${
          skipped ? ` · ${skipped} row${skipped === 1 ? "" : "s"} skipped` : ""
        }.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card mb-6 space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Import CSV</h2>
        <button type="button" className="text-sm text-zinc-500" onClick={onCancel}>
          Close
        </button>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-sm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          void loadPreview(f);
        }}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {preview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((field) => (
              <label key={field} className="block text-xs">
                {field}
                <select
                  className="ugclab-select mt-1 w-full"
                  value={mapping[field] ?? ""}
                  onChange={(e) => {
                    const next = { ...mapping };
                    if (e.target.value === "") delete next[field];
                    else next[field] = Number(e.target.value);
                    setMapping(next);
                    if (file) void loadPreview(file, next);
                  }}
                >
                  <option value="">Ignore</option>
                  {preview.headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-sm text-zinc-600">
            {preview.rowCount} rows · {preview.errorCount} with errors in the preview
          </p>
          <div className="max-h-64 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row) => (
                  <tr key={row.row} className="border-t">
                    <td className="px-3 py-2">{row.row}</td>
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">{row.price}</td>
                    <td className="px-3 py-2 text-red-600">{row.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit()}
            className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
          >
            {busy ? "Working…" : "Import rows"}
          </button>
        </>
      ) : busy ? (
        <p className="text-sm text-zinc-500">Reading file…</p>
      ) : null}
    </section>
  );
}
