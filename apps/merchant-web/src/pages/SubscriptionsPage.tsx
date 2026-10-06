import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { EmptyState } from "@/components/empty-state";

type Sub = {
  id: string;
  status: string;
  interval: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  customer: { id: string; email: string; name: string | null };
  product: { id: string; title: string };
  order: { id: string; orderNumber: string } | null;
};

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["product-subscriptions"],
    queryFn: () => api.productSubscriptions(),
  });
  const subscriptions = (data?.subscriptions ?? []) as Sub[];

  async function act(id: string, action: "cancel" | "pause" | "portal") {
    try {
      if (action === "portal") {
        const r = await api.productSubscriptionPortal(id);
        if (r.url) window.open(r.url, "_blank");
        return;
      }
      if (action === "cancel") {
        if (!confirm("Cancel this subscription? Access will be revoked.")) return;
        await api.cancelProductSubscription(id);
      } else {
        if (!confirm("Pause billing collection for this subscription?")) return;
        await api.pauseProductSubscription(id);
      }
      await qc.invalidateQueries({ queryKey: ["product-subscriptions"] });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (isLoading) {
    return (
      <AdminPageShell crumbs={[{ label: "Subscriptions" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Subscriptions" }]}
      title="Subscriptions"
      description="Active and past product subscriptions. Open Stripe portal to update payment methods."
    >
      {subscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          description="When customers buy subscription products, they appear here."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {subscriptions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="font-semibold text-zinc-900">{s.product.title}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {s.customer.email}
                  {s.order ? (
                    <>
                      {" · "}
                      <Link
                        to={`/orders/${s.order.id}`}
                        className="text-violet-700 hover:underline"
                      >
                        #{s.order.orderNumber}
                      </Link>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  <span className="uppercase">{s.status}</span>
                  {" · "}
                  {s.interval}
                  {s.currentPeriodEnd
                    ? ` · renews ${new Date(s.currentPeriodEnd).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status !== "CANCELLED" ? (
                  <>
                    <button
                      type="button"
                      className="ugclab-btn border border-zinc-200 bg-white text-xs"
                      onClick={() => void act(s.id, "portal")}
                    >
                      Billing portal
                    </button>
                    <button
                      type="button"
                      className="ugclab-btn border border-zinc-200 bg-white text-xs"
                      onClick={() => void act(s.id, "pause")}
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      className="ugclab-btn border border-red-200 bg-red-50 text-xs text-red-800"
                      onClick={() => void act(s.id, "cancel")}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-zinc-400">Ended</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
