import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  type StoreImportKind,
  type StoreImportPreview,
  type StoreImportResult,
} from "@/api/client";

const SOURCE_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  etsy: "Etsy",
};

const KIND_LABELS: Record<StoreImportKind, string> = {
  products: "products",
  customers: "customers",
  orders: "orders",
};

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function count(v: unknown): string {
  if (Array.isArray(v)) return String(v.length);
  if (typeof v === "number") return String(v);
  return "0";
}

function cents(v: unknown): string {
  return typeof v === "number" ? (v / 100).toFixed(2) : "—";
}

function sampleColumns(kind: StoreImportKind): {
  label: string;
  render: (row: Record<string, unknown>) => string;
}[] {
  if (kind === "products") {
    return [
      { label: "Title", render: (r) => str(r.title) },
      { label: "Price", render: (r) => cents(r.priceCents) },
      { label: "Variants", render: (r) => count(r.variants) },
      { label: "Images", render: (r) => count(r.imageUrls) },
    ];
  }
  if (kind === "customers") {
    return [
      { label: "Email", render: (r) => str(r.email) },
      { label: "Name", render: (r) => str(r.name) },
    ];
  }
  return [
    { label: "Order #", render: (r) => str(r.orderNumber) },
    { label: "Email", render: (r) => str(r.email) },
    { label: "Total", render: (r) => cents(r.totalCents) },
  ];
}

export function StoreImportPanel({
  onDone,
  onCancel,
}: {
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StoreImportPreview | null>(null);
  const [result, setResult] = useState<StoreImportResult | null>(null);
  const [downloadImages, setDownloadImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadPreview(nextFile: File) {
    setBusy(true);
    setError("");
    setResult(null);
    setPreview(null);
    try {
      const r = await api.previewStoreImport(nextFile);
      setPreview(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the export file");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file || !preview) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.importStoreFile(file, {
        images: preview.kind === "products" ? downloadImages : undefined,
      });
      setResult(r);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["customers"] }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      if (r.errors.length === 0) {
        onDone(
          `Imported ${r.created} ${KIND_LABELS[preview.kind]}${
            r.skipped ? ` · ${r.skipped} skipped` : ""
          }.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const sourceLabel = preview
    ? SOURCE_LABELS[preview.source.toLowerCase()] ?? preview.source
    : "";
  const columns = preview ? sampleColumns(preview.kind) : [];

  return (
    <section className="admin-card mb-6 space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Migrate from Shopify / WooCommerce / Etsy</h2>
        <button type="button" className="text-sm text-zinc-500" onClick={onCancel}>
          Close
        </button>
      </div>
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
        <p className="font-medium text-zinc-800">How to export from your current platform</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            <span className="font-medium">Shopify:</span> Admin → Products → Export (CSV, plain
            CSV file). Customers → Export for your customer list.
          </li>
          <li>
            <span className="font-medium">WooCommerce:</span> Products → Export.
          </li>
          <li>
            <span className="font-medium">Etsy:</span> Shop Manager → Listings → Download CSV.
          </li>
        </ul>
        <p className="mt-1.5">
          Upload the CSV below. The source and content type are detected automatically.
        </p>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-sm"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          void loadPreview(f);
        }}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {busy && !preview ? <p className="text-sm text-zinc-500">Reading file…</p> : null}

      {preview && !result ? (
        <>
          <p className="text-sm text-zinc-700">
            Detected <span className="font-medium">{sourceLabel}</span> export ·{" "}
            <span className="font-medium">
              {preview.count} {KIND_LABELS[preview.kind]}
            </span>
          </p>
          {preview.warnings.length > 0 ? (
            <ul className="list-disc space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 pl-7 text-xs text-amber-900">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
          {preview.sample.length > 0 ? (
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.label} className="px-3 py-2">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row, i) => (
                    <tr key={i} className="border-t">
                      {columns.map((c) => (
                        <td key={c.label} className="px-3 py-2">
                          {c.render(row) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview.kind === "products" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                className="rounded border-zinc-300"
              />
              Download product images
            </label>
          ) : null}
          <button
            type="button"
            disabled={busy || preview.count === 0}
            onClick={() => void commit()}
            className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
          >
            {busy ? "Importing…" : `Import ${preview.count} ${KIND_LABELS[preview.kind]}`}
          </button>
        </>
      ) : null}

      {result && preview ? (
        <div className="space-y-2 text-sm">
          <p className="text-zinc-800">
            Imported <span className="font-medium">{result.created}</span>{" "}
            {KIND_LABELS[preview.kind]}
            {result.skipped ? ` · ${result.skipped} skipped` : ""}
            {result.errors.length ? ` · ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}` : ""}
          </p>
          {result.warnings && result.warnings.length > 0 ? (
            <ul className="list-disc space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 pl-7 text-xs text-amber-900">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
          {result.errors.length > 0 ? (
            <ul className="max-h-40 list-disc space-y-0.5 overflow-auto rounded-lg border border-red-200 bg-red-50 px-4 py-2 pl-7 text-xs text-red-800">
              {result.errors.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            onClick={onCancel}
          >
            Done
          </button>
        </div>
      ) : null}
    </section>
  );
}
