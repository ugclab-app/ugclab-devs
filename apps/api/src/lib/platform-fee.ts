import type { SubscriptionPlan, Tenant } from "@ugclab/database";

/** Starter (free) default: 5% = 500 bps. Growth plans use 400 (4%). */
export const DEFAULT_PLATFORM_FEE_BPS = 500;
export const GROWTH_PLATFORM_FEE_BPS = 400;

type TenantWithPlan = Tenant & { subscriptionPlan?: SubscriptionPlan | null };

export function resolvePlatformFeeBps(tenant: TenantWithPlan): number {
  if (tenant.platformFeeBpsOverride != null && tenant.platformFeeBpsOverride >= 0) {
    return tenant.platformFeeBpsOverride;
  }
  return tenant.subscriptionPlan?.platformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;
}

export function calcPlatformFeeAmount(totalAmount: number, feeBps: number): number {
  if (feeBps <= 0 || totalAmount <= 0) return 0;
  return Math.round((totalAmount * feeBps) / 10000);
}
