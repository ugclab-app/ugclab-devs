export type TenantFeatureFlags = {
  marketing: boolean;
  subscriptions: boolean;
  customDomain: boolean;
  aiBuilder: boolean;
};

export const DEFAULT_FEATURE_FLAGS: TenantFeatureFlags = {
  marketing: true,
  subscriptions: true,
  customDomain: true,
  aiBuilder: false,
};

export function parseFeatureFlags(raw: unknown): TenantFeatureFlags {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FEATURE_FLAGS };
  const o = raw as Record<string, unknown>;
  return {
    marketing: o.marketing !== false,
    subscriptions: o.subscriptions !== false,
    customDomain: o.customDomain !== false,
    aiBuilder: o.aiBuilder === true,
  };
}
