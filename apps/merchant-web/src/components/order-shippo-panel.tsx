import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function OrderShippoPanel({
  orderId,
  hasShippingAddress,
  trackingNumber,
}: {
  orderId: string;
  hasShippingAddress: boolean;
  trackingNumber: string | null;
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);

  if (!hasShippingAddress) {
    return (
      <section className="admin-card p-6 text-sm text-zinc-500">
        <h3 className="font-semibold text-zinc-900">Shipping label</h3>
        <p className="mt-2">Add a shipping address on this order to create a Shippo label.</p>
      </section>
    );
  }

  async function createLabel() {
    if (!confirm("Create shipping label via Shippo? Requires SHIPPO_API_KEY on the server.")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.createShippingLabel(orderId);
      if (res.label?.labelUrl) setLabelUrl(res.label.labelUrl);
      await qc.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Label failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card p-6 text-sm">
      <h3 className="font-semibold text-zinc-900">Shipping label (Shippo)</h3>
      {trackingNumber ? (
        <p className="mt-2 font-mono text-xs text-zinc-700">
          Tracking: <span className="font-semibold">{trackingNumber}</span>
        </p>
      ) : (
        <p className="mt-2 text-zinc-500">No tracking number yet.</p>
      )}
      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void createLabel()}
          className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
        >
          {pending ? "Creating…" : trackingNumber ? "Regenerate label" : "Create Shippo label"}
        </button>
        {labelUrl ? (
          <a
            href={labelUrl}
            target="_blank"
            rel="noreferrer"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Open label PDF
          </a>
        ) : null}
      </div>
    </section>
  );
}
