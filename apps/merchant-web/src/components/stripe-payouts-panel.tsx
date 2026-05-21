import { formatMoney } from "@ugclab/i18n";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function StripePayoutsPanel({ connected }: { connected: boolean }) {
  const { data } = useQuery({
    queryKey: ["stripe-payouts"],
    queryFn: () => api.stripePayouts(),
    enabled: connected,
  });

  if (!connected || !data?.connected) return null;

  const currency = (data.currency as string) ?? "USD";
  const balance = data.balance as { available: number; pending: number } | null;
  const payouts = (data.payouts ?? []) as {
    id: string;
    amount: number;
    status: string;
    arrivalDate: string | null;
    createdAt: string;
  }[];

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Payouts & balance</h3>
      {balance ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Available</p>
            <p className="text-lg font-bold">{formatMoney(balance.available, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Pending</p>
            <p className="text-lg font-bold">{formatMoney(balance.pending, currency)}</p>
          </div>
        </div>
      ) : null}
      {payouts.length > 0 ? (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-zinc-500">
              <th className="py-1">Date</th>
              <th className="py-1">Amount</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100">
                <td className="py-2">
                  {p.arrivalDate
                    ? new Date(p.arrivalDate).toLocaleDateString()
                    : new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2">{formatMoney(p.amount, currency)}</td>
                <td className="py-2 capitalize">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-zinc-500">No payouts yet.</p>
      )}
    </section>
  );
}
