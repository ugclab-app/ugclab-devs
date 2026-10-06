import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { storeApi } from "@/api/client";

/** Persist ?ref=CODE as attribution cookie for checkout. */
export function useAffiliateRef(tenant: string) {
  const [params] = useSearchParams();
  const ref = params.get("ref")?.trim();

  useEffect(() => {
    if (!tenant || !ref) return;
    storeApi
      .affiliateAttribution(tenant, ref)
      .catch(() => {
        /* invalid or program off */
      });
  }, [tenant, ref]);
}
