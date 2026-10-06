import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { useState } from "react";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { useAdminT } from "@/hooks/use-admin-t";

type DisputeRow = {
  id: string;
  disputeId: string;
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
  const { t } = useAdminT();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["merchant-disputes"],
    queryFn: () => api.merchantDisputes(),
  });
  const [msg, setMsg] = useState<{ ok?: boolean; message?: string }>({});
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
      setMsg({ ok: false, message: "Missing Stripe dispute id" });
      return;
    }
    setPending(true);
    setMsg({});
    try {
      await api.submitMerchantDisputeEvidence(d.disputeId, { ...form, submit });
      setMsg({
        ok: true,
        message: submit
          ? `Evidence submitted for #${d.orderNumber}`
          : `Draft saved for #${d.orderNumber}`,
      });
      setOpenId(null);
      await qc.invalidateQueries({ queryKey: ["merchant-disputes"] });
    } catch (e) {
      setMsg({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: t.nav.orders, to: "/orders" }, { label: "Disputes" }]}
      title="Disputes"
      description="Stripe chargebacks for your store. Submit shipping proof before the due date."
    >
      <FormAlert ok={msg.ok} message={msg.message} />
      {query.isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : disputes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          No open disputes. New chargebacks from Stripe appear here automatically.
        </p>
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li key={d.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/orders/${d.orderId}`}
                    className="font-semibold text-violet-700 hover:underline"
                  >
                    Order #{d.orderNumber}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatMoney(d.amount, d.currency)} · {d.status}
                    {d.reason ? ` · ${d.reason}` : ""}
                  </p>
                  {d.evidenceDueBy ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Evidence due {new Date(d.evidenceDueBy).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ugclab-btn ugclab-btn-primary text-xs"
                  onClick={() =>
                    setOpenId((id) => (id === d.id ? null : d.id))
                  }
                >
                  {d.evidenceSubmitted ? "Update evidence" : "Submit evidence"}
                </button>
              </div>
              {openId === d.id ? (
                <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                  {(
                    [
                      ["customerName", "Customer name"],
                      ["customerEmailAddress", "Customer email"],
                      ["shippingTrackingNumber", "Tracking number"],
                      ["shippingCarrier", "Carrier"],
                      ["productDescription", "Product description"],
                      ["refundPolicy", "Refund policy"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-sm">
                      {label}
                      <input
                        className="ugclab-input mt-1 w-full"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                  <label className="block text-sm sm:col-span-2">
                    Notes
                    <textarea
                      className="ugclab-input mt-1 w-full"
                      rows={3}
                      value={form.uncategorizedText}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          uncategorizedText: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn border border-zinc-200 bg-white text-xs"
                      onClick={() => void submitEvidence(d, false)}
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="ugclab-btn ugclab-btn-primary text-xs"
                      onClick={() => void submitEvidence(d, true)}
                    >
                      Submit to Stripe
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
