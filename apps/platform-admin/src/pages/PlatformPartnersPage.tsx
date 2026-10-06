import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type Program = {
  cookieDays: number;
  holdDays: number;
  minPayoutCents: number;
  promoTrialDays: number;
};

type Balance = { pending: number; available: number; paid: number };

type Partner = {
  id: string;
  name: string;
  email: string;
  code: string;
  status: string;
  pitch: string;
  link: string | null;
  payoutMethod: string | null;
  payoutDetails: string | null;
  createdAt: string;
  _count: { clicks: number; stores: number; referrals: number };
  balances: Record<string, Balance>;
  stores: { id: string; name: string; slug: string; hasPaidOrder: boolean }[];
};

type Payout = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  note: string | null;
  partner: { name: string; email: string; payoutMethod: string | null; payoutDetails: string | null };
};

type Referral = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  availableAt: string;
  partner: { name: string; email: string; code: string };
  tenant: { name: string; slug: string };
};

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function PlatformPartnersPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const programQ = useQuery({
    queryKey: ["platform-partner-program"],
    queryFn: () => api.platformPartnerProgram(),
  });
  const partnersQ = useQuery({
    queryKey: ["platform-partners"],
    queryFn: () => api.platformPartners(),
  });
  const payoutsQ = useQuery({
    queryKey: ["platform-partner-payouts"],
    queryFn: () => api.platformPartnerPayouts(),
  });
  const referralsQ = useQuery({
    queryKey: ["platform-partner-referrals"],
    queryFn: () => api.platformPartnerReferrals(),
  });

  async function saveProgram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, number> = {
      cookieDays: Number(form.get("cookieDays")),
      holdDays: Number(form.get("holdDays")),
      promoTrialDays: Number(form.get("promoTrialDays")),
      minPayoutCents: Math.round(Number(form.get("minPayoutUsd")) * 100),
    };
    setError(null);
    try {
      await api.savePlatformPartnerProgram(body);
      await qc.invalidateQueries({ queryKey: ["platform-partner-program"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function act(id: string, action: "approve" | "reject" | "suspend") {
    setError(null);
    try {
      if (action === "approve") await api.approvePlatformPartner(id);
      else if (action === "reject") await api.rejectPlatformPartner(id);
      else await api.suspendPlatformPartner(id);
      await qc.invalidateQueries({ queryKey: ["platform-partners"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function payout(id: string, action: "processing" | "paid") {
    setError(null);
    try {
      if (action === "paid") await api.markPlatformPartnerPayoutPaid(id);
      else await api.markPlatformPartnerPayoutProcessing(id);
      await qc.invalidateQueries({ queryKey: ["platform-partner-payouts"] });
      await qc.invalidateQueries({ queryKey: ["platform-partners"] });
      await qc.invalidateQueries({ queryKey: ["platform-partner-referrals"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout update failed");
    }
  }

  const program = programQ.data as Program | undefined;
  const partners = (partnersQ.data?.partners ?? []) as Partner[];
  const payouts = (payoutsQ.data?.payouts ?? []) as Payout[];
  const referrals = (referralsQ.data?.referrals ?? []) as Referral[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Platform partners</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {program ? (
        <>
          <p className="text-sm text-slate-600">Commission is 0.2% of each paid order.</p>
          <form onSubmit={(e) => void saveProgram(e)} className="grid max-w-xl grid-cols-2 gap-3 rounded-xl bg-white p-4">
            <label className="text-xs text-slate-600">
              Cookie days
              <input name="cookieDays" type="number" defaultValue={program.cookieDays} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-slate-600">
              Hold days
              <input name="holdDays" type="number" defaultValue={program.holdDays} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-slate-600">
              Min payout (USD)
              <input
                name="minPayoutUsd"
                type="number"
                step="0.01"
                defaultValue={(program.minPayoutCents / 100).toFixed(2)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Extra trial days
              <input name="promoTrialDays" type="number" defaultValue={program.promoTrialDays} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
            </label>
            <button type="submit" className="col-span-2 mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">
              Save
            </button>
          </form>
        </>
      ) : null}

      <section>
        <h2 className="mb-2 font-semibold">Applications</h2>
        {partners.length === 0 ? <p className="text-sm text-slate-500">No applications yet.</p> : null}
        <div className="space-y-3">
          {partners.map((p) => {
            const currencies = Object.keys(p.balances);
            return (
              <article key={p.id} className="rounded-xl bg-white p-4 text-sm">
                <p className="font-medium">
                  {p.name} · {p.email} · {p.status}
                </p>
                <p className="mt-1 text-slate-600">{p.pitch}</p>
                <p className="mt-1 text-slate-500">
                  {p._count.clicks} clicks · {p._count.stores} stores · {p._count.referrals} commissions · code {p.code}
                </p>
                {currencies.length === 0 ? (
                  <p className="mt-2 text-slate-600">No commission yet.</p>
                ) : (
                  currencies.map((currency) => (
                    <p key={currency} className="mt-1 text-slate-700">
                      {currency}: pending {money(p.balances[currency].pending, currency)} · available{" "}
                      {money(p.balances[currency].available, currency)} · paid {money(p.balances[currency].paid, currency)}
                    </p>
                  ))
                )}
                <p className="mt-2 text-slate-600">
                  Payout: {p.payoutMethod && p.payoutDetails ? `${p.payoutMethod} — ${p.payoutDetails}` : "No payout details yet"}
                </p>
                {p.link ? <p className="mt-1 break-all text-violet-700">{p.link}</p> : null}
                {p.stores.length ? (
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {p.stores.map((store) => (
                      <li key={store.id}>
                        {store.name} · {store.slug} · {store.hasPaidOrder ? "has a paid order" : "no paid order"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-slate-500">No stores yet.</p>
                )}
                <div className="mt-2 flex gap-2">
                  {p.status === "PENDING" || p.status === "REJECTED" || p.status === "SUSPENDED" ? (
                    <button type="button" className="rounded border px-2 py-1" onClick={() => void act(p.id, "approve")}>
                      {p.status === "SUSPENDED" ? "Activate" : "Approve"}
                    </button>
                  ) : null}
                  {p.status === "PENDING" ? (
                    <button type="button" className="rounded border px-2 py-1" onClick={() => void act(p.id, "reject")}>
                      Reject
                    </button>
                  ) : null}
                  {p.status === "ACTIVE" ? (
                    <button type="button" className="rounded border px-2 py-1" onClick={() => void act(p.id, "suspend")}>
                      Suspend
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Commissions</h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-slate-500">No commissions yet. They appear after a referred store has a paid order.</p>
        ) : (
          <div className="space-y-3">
            {referrals.map((row) => (
              <article key={row.id} className="rounded-xl bg-white p-4 text-sm">
                <p className="font-medium">
                  {row.partner.name} · {money(row.amountCents, row.currency)} · {row.status}
                </p>
                <p className="mt-1 text-slate-600">
                  {row.tenant.name} · {row.tenant.slug}
                  {row.orderId ? ` · order ${row.orderId}` : ""}
                </p>
                <p className="mt-1 text-slate-500">
                  Available {row.availableAt.slice(0, 10)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Payouts</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-500">No payout requests yet. A partner requests one from their dashboard after the hold.</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <article key={p.id} className="rounded-xl bg-white p-4 text-sm">
                <p>
                  {p.partner.name} · {money(p.amountCents, p.currency)} · {p.status}
                </p>
                <p className="text-slate-600">{p.note}</p>
                {p.status !== "PAID" ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="rounded border px-2 py-1" onClick={() => void payout(p.id, "processing")}>
                      Processing
                    </button>
                    <button type="button" className="rounded border px-2 py-1" onClick={() => void payout(p.id, "paid")}>
                      Mark paid
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
