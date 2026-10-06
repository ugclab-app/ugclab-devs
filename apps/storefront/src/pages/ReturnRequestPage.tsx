import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function ReturnRequestPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get("token") ?? undefined;
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [isExchange, setIsExchange] = useState(false);
  const [done, setDone] = useState<{ rmaCode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["return-eligible", tenant, id, token],
    queryFn: () => storeApi.returnEligible(tenant, id!, token),
    enabled: !!id,
  });

  const create = useMutation({
    mutationFn: () => {
      const items = Object.entries(selected)
        .filter(([, q]) => q > 0)
        .map(([orderLineItemId, quantity]) => ({ orderLineItemId, quantity }));
      return storeApi.createReturn(tenant, id!, {
        token,
        reason: reason || undefined,
        note: note || undefined,
        isExchange,
        items,
      });
    },
    onSuccess: (res) => {
      const r = res.return as { rmaCode?: string };
      setDone({ rmaCode: r?.rmaCode });
      setError(null);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Request failed");
    },
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-zinc-600">This order is not eligible for returns.</p>
        <Link
          to={storeHref(`/orders/${id}`, nav) + (token ? `&token=${token}` : "")}
          className="mt-4 inline-block font-medium text-[var(--store-primary)]"
        >
          Back to order
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">Return requested</h1>
        {done.rmaCode ? (
          <p className="text-zinc-600">
            Your RMA code is <strong>{done.rmaCode}</strong>
          </p>
        ) : null}
        <Link
          to={storeHref(`/orders/${id}`, nav) + (token ? `&token=${token}` : "")}
          className="store-btn-primary inline-block"
        >
          Back to order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">
        Request return / exchange
      </h1>
      <p className="text-sm text-zinc-500">Order #{data.orderNumber}</p>

      {data.existingReturns.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Existing:{" "}
          {data.existingReturns
            .map((r) => `${r.rmaCode} (${r.status})`)
            .join(", ")}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3 rounded-xl border border-zinc-200 p-4">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <input
              type="number"
              min={0}
              max={item.quantity}
              value={selected[item.id] ?? 0}
              onChange={(e) =>
                setSelected((s) => ({
                  ...s,
                  [item.id]: Math.min(
                    item.quantity,
                    Math.max(0, Number(e.target.value) || 0)
                  ),
                }))
              }
              className="ugclab-input w-16"
            />
            <span className="flex-1">
              {item.title}{" "}
              <span className="text-zinc-400">(max {item.quantity})</span>
            </span>
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isExchange}
          onChange={(e) => setIsExchange(e.target.checked)}
        />
        This is an exchange
      </label>

      <div>
        <label className="block text-sm font-medium">Reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="ugclab-input mt-1 w-full"
          placeholder="Damaged, wrong size…"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="ugclab-input mt-1 w-full"
          rows={3}
        />
      </div>

      <button
        type="button"
        className="store-btn-primary w-full disabled:opacity-50"
        disabled={
          create.isPending ||
          Object.values(selected).every((q) => !q || q < 1)
        }
        onClick={() => create.mutate()}
      >
        {create.isPending ? "Submitting…" : "Submit request"}
      </button>

      <Link
        to={storeHref(`/orders/${id}`, nav) + (token ? `&token=${token}` : "")}
        className="block text-center text-sm text-zinc-500 hover:underline"
      >
        Cancel
      </Link>
    </div>
  );
}
