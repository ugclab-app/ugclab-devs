import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function DraftOrdersPage() {
  const qc = useQueryClient();
  const [params] = useState(() => new URLSearchParams({ status: "DRAFT" }));
  const { data } = useQuery({
    queryKey: ["orders", "DRAFT"],
    queryFn: () => api.orders(params),
  });
  const orders = (data?.orders ?? []) as { id: string; orderNumber: string; guestEmail: string | null }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Draft orders</h1>
      <p className="text-sm text-zinc-600">
        Create draft orders from the API or mark existing drafts as paid (demo, no Stripe).
      </p>
      <ul className="admin-card divide-y">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center justify-between px-6 py-4">
            <Link to={`/orders/${o.id}`} className="font-medium text-violet-600">
              #{o.orderNumber}
            </Link>
            <div className="flex gap-2">
              <span className="text-sm text-zinc-500">{o.guestEmail ?? "—"}</span>
              <button
                type="button"
                className="text-sm font-medium text-violet-600"
                onClick={async () => {
                  await api.markDraftPaid(o.id);
                  await qc.invalidateQueries({ queryKey: ["orders"] });
                }}
              >
                Mark paid
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
