import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

type Payout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
};

type Balance = {
  currency: string;
  earnedCents: number;
  platformFeesCents: number;
  paidOutCents: number;
  pendingPayoutCents: number;
  availableCents: number;
  payouts: Payout[];
};

export function TenantMorPayouts({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant-payouts", tenantId],
    queryFn: () => api.tenantPayouts(tenantId),
  });

  if (isLoading) return <p className="text-slate-500 text-sm">Loading MoR balance…</p>;
  if (error) {
    return (
      <p className="text-sm text-amber-800">
        MoR payouts unavailable (set PAYMENT_MODEL=mor on API).
      </p>
    );
  }

  const b = data!.balance as Balance;
  const cur = b.currency;

  async function markProcessing(payoutId: string) {
    setPending(true);
    setAlert("");
    try {
      await api.markPayoutProcessing(tenantId, payoutId);
      await qc.invalidateQueries({ queryKey: ["tenant-payouts", tenantId] });
      setAlert("Payout marked as in processing — merchant notified by email");
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function markPaid(payoutId: string) {
    setPending(true);
    setAlert("");
    try {
      await api.markPayoutPaid(tenantId, payoutId);
      await qc.invalidateQueries({ queryKey: ["tenant-payouts", tenantId] });
      setAlert("Payout marked as paid — merchant notified by email");
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function markFailed(payoutId: string) {
    const reason = window.prompt(
      "Failure reason (shown to merchant in email):",
      "Bank details could not be verified"
    );
    if (reason === null) return;
    setPending(true);
    setAlert("");
    try {
      await api.markPayoutFailed(tenantId, payoutId, reason);
      await qc.invalidateQueries({ queryKey: ["tenant-payouts", tenantId] });
      setAlert("Payout marked failed — merchant notified if enabled");
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  function statusLabel(status: string) {
    if (status === "PENDING") return "Requested";
    if (status === "PROCESSING") return "In processing";
    if (status === "PAID") return "Paid";
    if (status === "FAILED") return "Failed";
    return status;
  }

  async function recordPayout(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setAlert("Enter a valid amount");
      return;
    }
    setPending(true);
    setAlert("");
    try {
      await api.createTenantPayout(tenantId, { amountCents: cents, note, status: "PAID" });
      setAmount("");
      setNote("");
      await qc.invalidateQueries({ queryKey: ["tenant-payouts", tenantId] });
      setAlert("Payout recorded");
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="platform-card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">MoR payouts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Platform collects payments; pay merchant manually, then mark PAID here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Stat label="Merchant earned" value={formatMoney(b.earnedCents, cur)} />
        <Stat label="Platform fees" value={formatMoney(b.platformFeesCents, cur)} />
        <Stat label="Available" value={formatMoney(b.availableCents, cur)} highlight />
        <Stat label="Pending requests" value={formatMoney(b.pendingPayoutCents, cur)} />
      </div>

      {alert ? <p className="text-sm text-sky-700">{alert}</p> : null}

      <button
        type="button"
        className="ugclab-btn border border-slate-200 bg-white text-sm"
        onClick={() =>
          api.exportPayoutsCsv().catch((e) => setAlert(e instanceof Error ? e.message : "Failed"))
        }
      >
        Export all payouts CSV
      </button>

      <form onSubmit={recordPayout} className="flex flex-wrap items-end gap-3 border-t pt-4">
        <label className="text-sm">
          <span className="text-slate-500">Record payout ({cur})</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2"
            placeholder="0.00"
          />
        </label>
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="text-slate-500">Note</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Bank transfer ref…"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary text-sm"
        >
          Record as paid
        </button>
      </form>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {b.payouts.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 font-medium">
                  {formatMoney(p.amount, p.currency)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      p.status === "PAID"
                        ? "text-emerald-700"
                        : p.status === "FAILED"
                          ? "text-red-700"
                        : p.status === "PROCESSING"
                          ? "text-sky-700"
                          : "text-amber-700"
                    }
                  >
                    {statusLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600 max-w-xs truncate">
                  {p.note ?? "—"}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {p.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markProcessing(p.id)}
                        className="text-sky-600 hover:underline text-xs font-medium"
                      >
                        Processing
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markPaid(p.id)}
                        className="text-emerald-700 hover:underline text-xs font-medium"
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markFailed(p.id)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Mark failed
                      </button>
                    </>
                  ) : p.status === "PROCESSING" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markPaid(p.id)}
                        className="text-emerald-700 hover:underline text-xs font-medium"
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => markFailed(p.id)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Mark failed
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
            {b.payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No payouts yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${highlight ? "border-sky-200 bg-sky-50" : "border-slate-100 bg-slate-50"}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
