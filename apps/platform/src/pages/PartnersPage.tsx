import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@ugclab/ui";
import { publicPartnerUrl } from "@/lib/api-public";
import { merchantAdminUrl } from "@/lib/urls";

type Program = {
  turnoverBps: number;
  cookieDays: number;
  holdDays: number;
  minPayoutCents: number;
  promoTrialDays: number;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function PartnersPage() {
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch(publicPartnerUrl("/partners/program"))
      .then((res) => res.json())
      .then((data) => setProgram(data as Program))
      .catch(() => setProgram(null));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(publicPartnerUrl("/partners/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          pitch: form.get("pitch"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not submit");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold text-zinc-900">
            Tescommerce
          </Link>
          <a href={`${merchantAdminUrl}/login`} className="text-sm font-medium text-violet-700">
            Partner login
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900">Earn by introducing stores</h1>
        <p className="mt-3 text-zinc-600">
          Share Tescommerce with people opening an online store. You earn 0.2% of each paid
          order on stores you bring.
        </p>
        {program ? (
          <ul className="mt-6 space-y-2 text-sm text-zinc-700">
            <li>
              You earn {program.turnoverBps / 100}% of each paid order on a store you referred.
            </li>
            <li>The link lasts {program.cookieDays} days. Last click wins.</li>
            <li>
              Commissions stay pending {program.holdDays} days, then you can request a payout
              from {money(program.minPayoutCents)}.
            </li>
            <li>You cannot refer your own store or email.</li>
            <li>A refund voids that order’s commission if it has not been paid out.</li>
          </ul>
        ) : null}

        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Apply</h2>
          {done ? (
            <p className="mt-3 text-sm text-zinc-700">
              Application received. Sign in at the merchant admin — your link appears after we
              approve it.
            </p>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-col gap-4">
              <Input name="name" label="Name" required />
              <Input name="email" type="email" label="Email" required />
              <Input name="password" type="password" label="Password" required minLength={8} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">
                  Where will you send people?
                </span>
                <textarea
                  name="pitch"
                  required
                  minLength={10}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Apply"}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
