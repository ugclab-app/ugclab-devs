import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

function when(value: string) {
  return new Date(value).toLocaleString();
}

export default function PaymentErrorsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["payment-errors"], queryFn: () => api.paymentErrors() });
  const replay = useMutation({
    mutationFn: (id: string) => api.replayStripeEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-errors"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment errors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Failed Stripe, GoPay, and Finik events from the last 14 days, plus checkouts still unpaid after two hours.
        </p>
      </div>
      {replay.error ? <p className="text-sm text-red-600">{(replay.error as Error).message}</p> : null}
      <QueryState query={query}>
        {(data) => (
          <div className="space-y-6">
            <section className="platform-card overflow-hidden">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">Stripe</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {data.stripe.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{when(row.createdAt)}</td>
                      <td className="px-4 py-2 font-medium">{row.type}</td>
                      <td className="px-4 py-2 text-red-600">{row.error ?? (row.processed ? "processed" : "not processed")}</td>
                      <td className="px-4 py-2 text-right">
                        {row.replayable ? (
                          <button
                            type="button"
                            className="text-sky-600"
                            disabled={replay.isPending}
                            onClick={() => replay.mutate(row.id)}
                          >
                            Replay
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {data.stripe.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500">No Stripe payment errors.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
            <section className="platform-card overflow-hidden">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">GoPay and Finik</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {[...data.gopay.map((row) => ({ ...row, provider: "GoPay" })), ...data.finik.map((row) => ({ ...row, provider: "Finik" }))].map(
                    (row) => (
                      <tr key={`${row.provider}-${row.id}`}>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-500">{when(row.createdAt)}</td>
                        <td className="px-4 py-2 font-medium">{row.provider}</td>
                        <td className="px-4 py-2">{row.type}</td>
                        <td className="px-4 py-2 text-red-600">{row.error ?? "not processed"}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
            <section className="platform-card overflow-hidden">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">Checkouts still unpaid</h2>
              <ul className="divide-y">
                {data.stuckOrders.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <Link to={`/orders/${row.id}`} className="font-medium text-sky-700">
                        {row.orderNumber}
                      </Link>
                      <p className="text-slate-500">
                        {row.store} · {row.provider ?? "card"} · {when(row.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
                {data.stuckOrders.length === 0 ? <li className="px-4 py-6 text-sm text-slate-500">None.</li> : null}
              </ul>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}
