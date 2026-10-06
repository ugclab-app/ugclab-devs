import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { useState } from "react";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type DisputeRow = {
  id: string;
  disputeId: string;
  tenantId: string;
  tenantName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  evidenceDueBy: string | null;
  evidenceSubmitted?: boolean;
  createdAt: string;
};

export default function DisputesPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["disputes"], queryFn: () => api.disputes() });
  const refundsQ = useQuery({
    queryKey: ["platform-orders-refunded"],
    queryFn: () => {
      const p = new URLSearchParams({ status: "REFUNDED" });
      return api.orders(p);
    },
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerEmailAddress: "",
    shippingTrackingNumber: "",
    shippingCarrier: "",
    productDescription: "",
    refundPolicy: "",
    uncategorizedText: "",
  });

  const disputes = (query.data?.disputes ?? []) as DisputeRow[];

  async function submitEvidence(d: DisputeRow, submit: boolean) {
    if (!d.disputeId) {
      setMsg("Missing Stripe dispute id — sync from webhook first");
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      await api.submitDisputeEvidence(d.disputeId, { ...form, submit });
      setMsg(
        submit
          ? `Evidence submitted for #${d.orderNumber}`
          : `Evidence draft saved for #${d.orderNumber}`
      );
      setOpenId(null);
      await qc.invalidateQueries({ queryKey: ["disputes"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Disputes & refunds</h1>
        <p className="text-sm text-slate-500">
          Stripe disputes with evidence workflow. Submit shipping proof and notes before the due date.
        </p>
      </div>
      {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Disputes</h2>
        <QueryState query={query}>
          {() => (
            <div className="space-y-4">
              <div className="platform-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Due</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {disputes.map((d) => (
                      <tr key={d.id}>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <Link to={`/tenants/${d.tenantId}`} className="text-sky-600">
                            {d.tenantName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 font-mono">
                          <Link to={`/orders/${d.orderId}`} className="text-sky-600">
                            #{d.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 font-medium">
                          {formatMoney(d.amount, d.currency)}
                        </td>
                        <td className="px-6 py-3">
                          {d.status}
                          {d.evidenceSubmitted ? (
                            <span className="ml-1 text-xs text-emerald-600">· evidence</span>
                          ) : null}
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-500">
                          {d.evidenceDueBy
                            ? new Date(d.evidenceDueBy).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              className="text-left text-xs font-medium text-violet-700 hover:underline"
                              onClick={() => {
                                setOpenId(openId === d.id ? null : d.id);
                                setForm({
                                  customerName: "",
                                  customerEmailAddress: "",
                                  shippingTrackingNumber: "",
                                  shippingCarrier: "",
                                  productDescription: "",
                                  refundPolicy: "",
                                  uncategorizedText: "",
                                });
                              }}
                            >
                              {openId === d.id ? "Close evidence" : "Submit evidence"}
                            </button>
                            <Link
                              to={`/orders/${d.orderId}`}
                              className="text-xs text-sky-600 hover:underline"
                            >
                              Open order
                            </Link>
                            <a
                              href={
                                d.disputeId
                                  ? `https://dashboard.stripe.com/disputes/${d.disputeId}`
                                  : "https://dashboard.stripe.com/disputes"
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-500 hover:underline"
                            >
                              Stripe ↗
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                          No disputes recorded
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {disputes
                .filter((d) => d.id === openId)
                .map((d) => (
                  <div
                    key={`ev-${d.id}`}
                    className="platform-card space-y-3 p-5"
                  >
                    <h3 className="font-semibold">
                      Evidence for #{d.orderNumber}
                      {d.reason ? (
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          · {d.reason}
                        </span>
                      ) : null}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["customerName", "Customer name"],
                          ["customerEmailAddress", "Customer email"],
                          ["shippingTrackingNumber", "Tracking number"],
                          ["shippingCarrier", "Carrier"],
                          ["productDescription", "Product description"],
                          ["refundPolicy", "Refund policy URL / text"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block text-xs text-slate-600">
                          {label}
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={form[key]}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, [key]: e.target.value }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <label className="block text-xs text-slate-600">
                      Additional notes
                      <textarea
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={form.uncategorizedText}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            uncategorizedText: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        onClick={() => void submitEvidence(d, true)}
                      >
                        {pending ? "…" : "Submit to Stripe"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                        onClick={() => void submitEvidence(d, false)}
                      >
                        Save draft
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </QueryState>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent refunds</h2>
        <QueryState query={refundsQ}>
          {(data) => {
            const orders = (data.orders ?? []) as Array<{
              id: string;
              orderNumber: string;
              totalAmount: number;
              currency: string;
              tenant?: { name: string };
            }>;
            if (!orders.length) {
              return <p className="text-sm text-slate-500">No refunded orders</p>;
            }
            return (
              <ul className="platform-card divide-y">
                {orders.slice(0, 20).map((o) => (
                  <li key={o.id} className="flex justify-between px-6 py-3 text-sm">
                    <Link to={`/orders/${o.id}`} className="text-sky-600">
                      #{o.orderNumber} · {o.tenant?.name}
                    </Link>
                    <span>{formatMoney(o.totalAmount, o.currency)}</span>
                  </li>
                ))}
              </ul>
            );
          }}
        </QueryState>
      </section>
    </div>
  );
}
