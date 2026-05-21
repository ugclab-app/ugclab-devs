import { useStore } from "@/context/store";
import { TrustBadges } from "@/components/trust-badges";

/** Trust badges on cart, checkout, product — default on unless explicitly disabled */
export function StoreTrustStrip() {
  const { theme } = useStore();
  if (theme.trustBadgesEnabled === false) return null;
  return <TrustBadges />;
}
