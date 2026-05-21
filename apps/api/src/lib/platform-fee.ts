import type { SubscriptionPlan, Tenant } from "@ugclab/database";

type TenantWithPlan = Tenant & { subscriptionPlan?: SubscriptionPlan | null };

export function resolvePlatformFeeBps(tenant: TenantWithPlan): number {
  if (tenant.platformFeeBpsOverride != null && tenant.platformFeeBpsOverride >= 0) {
    return tenant.platformFeeBpsOverride;
  }
  return tenant.subscriptionPlan?.platformFeeBps ?? 500;
}

export function calcPlatformFeeAmount(totalAmount: number, feeBps: number): number {
  if (feeBps <= 0 || totalAmount <= 0) return 0;
  return Math.round((totalAmount * feeBps) / 10000);
}
