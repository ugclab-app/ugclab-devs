import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";

export function PassportKycBanner() {
  const { ta } = useAdminT();
  const { data, isError } = useQuery({
    queryKey: ["merchant-kyc"],
    queryFn: () => api.merchantKyc(),
    retry: false,
  });

  if (isError || !data) return null;
  if (data.kyc?.status === "APPROVED") return null;

  const message =
    data.kyc?.status === "PENDING"
      ? ta("dashboard.kycPending")
      : data.kyc?.status === "REJECTED"
        ? ta("dashboard.kycRejected")
        : ta("dashboard.kycMissing");

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">{message}</p>
      <Link to="/payments#passport-kyc" className="mt-2 inline-block font-semibold text-amber-900 underline">
        {ta("dashboard.kycCta")} →
      </Link>
    </div>
  );
}
