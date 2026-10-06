import { useState } from "react";
import { storeApi } from "@/api/client";

export function StockAlertForm({
  tenant,
  productId,
  variantId,
}: {
  tenant: string;
  productId: string;
  variantId?: string;
}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        We&apos;ll email you when this is back in stock.
      </p>
    );
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        try {
          await storeApi.stockAlert(tenant, { productId, variantId, email });
          setDone(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm font-medium text-zinc-800">Email me when it&apos;s back</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="store-btn-secondary shrink-0 text-sm disabled:opacity-50"
        >
          {pending ? "…" : "Notify me"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
