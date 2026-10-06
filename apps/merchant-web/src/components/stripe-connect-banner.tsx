import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";

export function StripeConnectBanner() {
  const { ta } = useAdminT();
  const { data } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => api.stripeStatus(),
  });

  if (!data?.configured) return null;
  if (data.paymentsReady) return null;
  if (data.paymentModel === "mor") return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">{ta("stripe.connectBanner")}</p>
      <Link
        to="/settings?tab=payments"
        className="mt-2 inline-block font-semibold text-amber-900 underline"
      >
        {ta("stripe.connectCta")} →
      </Link>
    </div>
  );
}
