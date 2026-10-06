import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { EmptyState } from "@/components/empty-state";

const STATUS_ACTIONS: { label: string; status: string }[] = [
  { label: "Approve", status: "APPROVED" },
  { label: "Decline", status: "DECLINED" },
  { label: "Create label", status: "LABEL_CREATED" },
  { label: "Received", status: "RECEIVED" },
  { label: "Refund", status: "REFUNDED" },
  { label: "Exchange", status: "EXCHANGED" },
];

type ReturnRow = {
  id: string;
  rmaCode: string;
  status: string;
  reason: string | null;
  note: string | null;
  isExchange: boolean;
  labelUrl: string | null;
  trackingNumber: string | null;
  refundAmountCents: number | null;
  exchangeProductId: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string; status: string };
  customer: { email: string; name: string | null } | null;
  items: {
    id: string;
    quantity: number;
    reason: string | null;
    orderLineItem: { id: string; title: string; unitAmount: number };
  }[];
};

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [alert, setAlert] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refundCents, setRefundCents] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => api.returns(),
  });

  const returns = (data?.returns ?? []) as ReturnRow[];

  async function setStatus(id: string, status: string) {
    setBusy(`${id}:${status}`);
    setAlert("");
    try {
      const body: {
        status: string;
        refundAmountCents?: number;
      } = { status };
      if (status === "REFUNDED") {
        const raw = refundCents[id]?.trim();
        if (raw) {
          const dollars = parseFloat(raw);
          if (!Number.isNaN(dollars) && dollars > 0) {
            body.refundAmountCents = Math.round(dollars * 100);
          }
        }
      }
      const r = await api.patchReturn(id, body);
      const ret = r.return as ReturnRow | undefined;
      await qc.invalidateQueries({ queryKey: ["returns"] });
      let msg = `Updated to ${status}`;
      if (ret?.labelUrl) msg += ` · label ready`;
      if (ret?.refundAmountCents != null) {
        msg += ` · refunded ${(ret.refundAmountCents / 100).toFixed(2)}`;
      }
      setAlert(msg);
      setExpanded(id);
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <AdminPageShell
      crumbs={[{ label: "Returns" }]}
      title="Returns"
      description="Approve, create return labels, restock, refund, or create exchange orders."
    >
      {alert ? (
        <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
          {alert}
        </p>
      ) : null}
      {returns.length === 0 ? (
        <EmptyState
          title="No returns yet"
          description="Return requests from the storefront will appear here."
        />
      ) : (
        <div className="space-y-4">
          {returns.map((r) => {
            const open = expanded === r.id;
            const suggestedRefund = r.items.reduce(
              (s, i) => s + i.orderLineItem.unitAmount * i.quantity,
              0
            );
            return (
              <div key={r.id} className="admin-card p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {r.rmaCode}{" "}
                      <span className="text-xs font-normal uppercase text-zinc-500">
                        {r.status}
                        {r.isExchange ? " · exchange" : ""}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Order{" "}
                      <Link
                        to={`/orders/${r.order.id}`}
                        className="font-medium text-violet-700 hover:underline"
                      >
                        #{r.order.orderNumber}
                      </Link>
                      {r.customer?.email ? ` · ${r.customer.email}` : ""}
                      {" · "}
                      {r.items.length} line{r.items.length === 1 ? "" : "s"}
                    </p>
                    {r.reason ? (
                      <p className="mt-1 text-sm text-zinc-500">Reason: {r.reason}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-700 hover:underline"
                    onClick={() => setExpanded(open ? null : r.id)}
                  >
                    {open ? "Hide detail" : "Show detail"}
                  </button>
                </div>

                {open ? (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm space-y-2">
                    <ul className="space-y-1">
                      {r.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span>
                            {i.orderLineItem.title} × {i.quantity}
                          </span>
                          <span className="text-zinc-500">
                            {formatMoney(
                              i.orderLineItem.unitAmount * i.quantity,
                              "USD"
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {r.labelUrl ? (
                      <p>
                        Label:{" "}
                        <a
                          href={r.labelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-700 hover:underline"
                        >
                          Open return label
                        </a>
                        {r.trackingNumber ? ` · ${r.trackingNumber}` : ""}
                      </p>
                    ) : null}
                    {r.refundAmountCents != null ? (
                      <p className="text-zinc-700">
                        Refunded: {formatMoney(r.refundAmountCents, "USD")}
                      </p>
                    ) : null}
                    {r.isExchange ? (
                      <p className="text-zinc-600">
                        Exchange product: {r.exchangeProductId ?? "—"}
                        {r.status === "EXCHANGED" ? (
                          <>
                            {" · "}
                            <Link
                              to={`/orders/${r.order.id}`}
                              className="text-violet-700 hover:underline"
                            >
                              View original order
                            </Link>
                            {" (exchange order tagged on timeline)"}
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {r.note ? <p className="text-zinc-500">Note: {r.note}</p> : null}
                    <label className="block text-xs text-zinc-600">
                      Refund amount (optional, default = line total{" "}
                      {formatMoney(suggestedRefund, "USD")})
                      <input
                        className="ugclab-input mt-1 w-40 text-sm"
                        placeholder={(suggestedRefund / 100).toFixed(2)}
                        value={refundCents[r.id] ?? ""}
                        onChange={(e) =>
                          setRefundCents((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.map((a) => (
                    <button
                      key={a.status}
                      type="button"
                      disabled={busy !== null || r.status === a.status}
                      onClick={() => void setStatus(r.id, a.status)}
                      className="ugclab-btn border border-zinc-200 bg-white text-xs disabled:opacity-40"
                    >
                      {busy === `${r.id}:${a.status}` ? "…" : a.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminPageShell>
  );
}
