import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function PartnerPage() {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [method, setMethod] = useState("wise");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const q = useQuery({
    queryKey: ["platform-partner"],
    queryFn: () => api.platformPartner(),
  });

  const partner = q.data?.partner;

  useEffect(() => {
    if (!partner) return;
    if (partner.payoutMethod) setMethod(partner.payoutMethod);
    if (partner.payoutDetails) setDetails(partner.payoutDetails);
  }, [partner]);

  async function savePayout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.savePlatformPartnerPayout(method, details);
      await qc.invalidateQueries({ queryKey: ["platform-partner"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function request(currency: string) {
    setError(null);
    try {
      await api.requestPlatformPartnerPayout(currency);
      await qc.invalidateQueries({ queryKey: ["platform-partner"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Partner program</h1>
          {tenant ? (
            <Link to="/dashboard" className="text-sm font-medium text-violet-700">
              Back to store
            </Link>
          ) : (
            <Link to="/no-store" className="text-sm font-medium text-violet-700">
              Create a store
            </Link>
          )}
        </div>

        {q.isLoading ? <p className="mt-6 text-sm text-zinc-500">Loading…</p> : null}
        {q.isError ? (
          <p className="mt-6 text-sm text-red-600">Could not load partner profile.</p>
        ) : null}
        {q.isSuccess && !partner ? (
          <p className="mt-6 text-sm text-zinc-600">
            This account is not a platform partner. Apply on the Tescommerce partners page.
          </p>
        ) : null}

        {partner ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Status</p>
              <p className="text-lg font-semibold">{partner.status}</p>
              {partner.status !== "ACTIVE" ? (
                <p className="mt-2 text-sm text-zinc-600">
                  Your link goes live after Tescommerce approves the application.
                </p>
              ) : null}
              {partner.link ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-zinc-800">Your link</p>
                  <p className="mt-1 break-all text-sm text-violet-700">{partner.link}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-violet-700"
                    onClick={() => {
                      void navigator.clipboard.writeText(partner.link ?? "");
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  {partner.blurb ? (
                    <button
                      type="button"
                      className="ml-4 text-sm font-medium text-violet-700"
                      onClick={() => void navigator.clipboard.writeText(partner.blurb ?? "")}
                    >
                      Copy blurb
                    </button>
                  ) : null}
                  {partner.qrUrl ? (
                    <img src={partner.qrUrl} alt="QR code for your partner link" className="mt-4 h-36 w-36" />
                  ) : null}
                </div>
              ) : null}
              <p className="mt-4 text-sm text-zinc-600">
                {partner.program.turnoverBps / 100}% of each paid order. Hold{" "}
                {partner.program.holdDays} days. Minimum payout{" "}
                {money(partner.program.minPayoutCents, "USD")}.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs text-zinc-500">Clicks</p>
                <p className="text-xl font-semibold">{partner.clicks}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs text-zinc-500">Stores</p>
                <p className="text-xl font-semibold">{partner.stores.length}</p>
              </div>
            </section>

            {Object.entries(partner.balances).map(([currency, row]) => (
              <section key={currency} className="rounded-2xl bg-white p-5">
                <p className="font-semibold">{currency}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Pending {money(row.pending, currency)} · Available {money(row.available, currency)} ·
                  Paid {money(row.paid, currency)}
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={partner.status !== "ACTIVE" || row.available <= 0}
                  onClick={() => void request(currency)}
                >
                  Request payout
                </button>
              </section>
            ))}

            <form onSubmit={(e) => void savePayout(e)} className="rounded-2xl bg-white p-5">
              <h2 className="font-semibold">Payout details</h2>
              <label className="mt-3 block text-sm">
                Method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <option value="wise">Wise</option>
                  <option value="bank">Bank</option>
                  <option value="mbank">MBank</option>
                </select>
              </label>
              <label className="mt-3 block text-sm">
                Details
                <textarea
                  value={details || partner.payoutDetails || ""}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                  placeholder="Name, account, currency"
                />
              </label>
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
              <button type="submit" className="mt-3 rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Save
              </button>
            </form>

            {partner.stores.length ? (
              <section className="rounded-2xl bg-white p-5">
                <h2 className="font-semibold">Referred stores</h2>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {partner.stores.map((store) => (
                    <li key={store.id}>
                      {store.name} · {store.slug}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
