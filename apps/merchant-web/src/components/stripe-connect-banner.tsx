import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function StripeConnectBanner() {
  const { data } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => api.stripeStatus(),
  });

  if (!data?.configured) return null;
  if (data.paymentsReady) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Connect Stripe to receive payouts</p>
      <p className="mt-1 text-amber-800/90">
        {data.connected
          ? "Finish onboarding so card payments go to your account."
          : "Link your Stripe Express account — platform fee is deducted automatically."}
      </p>
      <Link
        to="/settings?tab=payments"
        className="mt-2 inline-block font-semibold text-amber-900 underline"
      >
        Payment settings →
      </Link>
    </div>
  );
}
